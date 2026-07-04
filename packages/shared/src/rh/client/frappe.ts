/* ============================================================
   @emela/shared — Client Frappe RH/MSS — RÉALIGNÉ sur le back RÉEL.
   ------------------------------------------------------------
   Cible UNIQUEMENT des endpoints existants de benin_hr (vérifié 2026-06-21) :
   • Méthodes whitelistées :
       analytics.payroll_aggregates / headcount        → KPIs
       cockpit.get_team_pending                         → demandes d'équipe (MSS)
       declarations.generate_*                          → déclarations (à la demande)
   • Doctypes REST /api/resource (permissions back appliquées) :
       Employee, Localized Contract, Payroll Run, Payroll Slip, Payroll Parameter.
   Getters sans source back native = « BACK-GAP » (repli typé vide + TODO),
   au lieu d'appels fictifs (l'ancien stub visait get_rh_kpis, list_declarations,
   separation.list_separations… qui N'EXISTENT PAS).
   ============================================================ */
import type {
  RhDataSource, RhKpi, DirectoryEmployee, Contract, PayrollRun, PayrollSlipRow,
  ValidationItem, Declaration, RhEvaluation, Separation, DocumentTemplate, PayrollParameter,
  EmployeeStatus, ContractStatus, ContractType, PayrollRunStatus,
} from '../types';
import { authHeaders } from '../../session';

// Base API : relatif par défaut (même origine, ex. reverse-proxy sous le domaine
// Frappe) ; surchargeable en cross-origin via PUBLIC_FRAPPE_URL.
const ROOT = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';
const BASE = `${ROOT}/api`;

async function method<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/method/${path}${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`benin_hr ${path} → ${res.status}`);
  return (await res.json()).message as T;
}

async function resource<T = any[]>(
  doctype: string, fields: string[], filters: Record<string, unknown> = {}, order_by = '',
): Promise<T> {
  const qs = new URLSearchParams({
    fields: JSON.stringify(fields), filters: JSON.stringify(filters),
    limit_page_length: '0', ...(order_by ? { order_by } : {}),
  }).toString();
  const res = await fetch(`${BASE}/resource/${encodeURIComponent(doctype)}?${qs}`, {
    headers: { Accept: 'application/json', ...authHeaders() },
  });
  if (!res.ok) throw new Error(`benin_hr ${doctype} → ${res.status}`);
  return ((await res.json()).data ?? []) as T;
}

const SELF = 'benin_hr.api.self_requests';

/** Écriture POST (validation RH/MSS) avec forward du jeton CSRF de la session. */
async function writeMethod<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const csrf = (await method<{ csrf_token: string }>('benin_hr.api.cockpit.get_csrf_token'))?.csrf_token;
  const res = await fetch(`${BASE}/method/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json', Accept: 'application/json',
      'X-Frappe-CSRF-Token': csrf ?? '', ...authHeaders(),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`benin_hr ${path} → ${res.status}`);
  return (await res.json()).message as T;
}

export type PendingRow = {
  name: string; employee: string; employee_name: string; amount?: number;
  request_date?: string; expense_date?: string; category?: string;
  period_month?: string; period_year?: string;
  leave_type?: string; from_date?: string; to_date?: string; total_leave_days?: number;
  attestation_type?: string;
  /** Note de frais : file_url du reçu joint (M0-②), servi via le proxy download. */
  justificatif?: string;
};
export type PendingValidations = {
  scope: 'hr' | 'team' | 'none';
  acomptes: PendingRow[]; heures_sup: PendingRow[]; notes_de_frais: PendingRow[];
  conges: PendingRow[]; attestations: PendingRow[];
};

/** Demandes en attente que l'utilisateur connecté est autorisé à valider. */
export const getPendingValidations = (): Promise<PendingValidations> =>
  method('benin_hr.api.cockpit.get_pending_validations');

export type DecisionResult = { name: string; status: string };

/** Validation/refus RH/MSS d'une demande d'acompte. */
export const decideAcompte = (name: string, approve: boolean): Promise<DecisionResult> =>
  writeMethod(`${SELF}.decide_acompte`, { name, approve });

/** Validation/refus d'une note de frais. */
export const decideNoteDeFrais = (name: string, approve: boolean): Promise<DecisionResult> =>
  writeMethod(`${SELF}.decide_note_de_frais`, { name, approve });

/** Validation/refus d'une saisie d'heures supplémentaires. */
export const decideHeuresSup = (name: string, approve: boolean): Promise<DecisionResult> =>
  writeMethod(`${SELF}.decide_heures_sup`, { name, approve });

/** Validation/refus d'une demande de congé (Leave Application HRMS). */
export const decideConge = (name: string, approve: boolean): Promise<DecisionResult> =>
  writeMethod(`${SELF}.decide_conge`, { name, approve });

/** Délivrance/refus d'une demande d'attestation. */
export const decideAttestation = (name: string, approve: boolean): Promise<DecisionResult> =>
  writeMethod(`${SELF}.decide_attestation`, { name, approve });

// ---- Courriers : historique des attestations délivrées / refusées (lecture) ----
// La FILE à délivrer réutilise getPendingValidations().attestations (SoD back).
// Ici : l'historique via REST Attestation (Delivree/Rejete) + jointure des noms.
export type AttestationRow = {
  name: string; employee: string; employee_name: string;
  attestation_type: string;
  status: 'Demande' | 'Delivree' | 'Rejete' | string;
  delivered_by?: string; issued_on?: string;
  verification_id?: string; document?: string;
};

/** Attestations délivrées / refusées (historique). DocPerm : HR User / Payroll User
 *  / Director (lecture) / System Manager. */
export const getDeliveredAttestations = async (): Promise<AttestationRow[]> => {
  const rows = await resource<any[]>(
    'Attestation',
    ['name', 'employee', 'attestation_type', 'status', 'delivered_by', 'issued_on', 'verification_id', 'document'],
    { status: ['in', ['Delivree', 'Rejete']] }, 'modified desc',
  );
  const ids = [...new Set(rows.map((r) => r.employee).filter(Boolean))];
  // Leçon ressource-par-ressource : Payroll User n'a pas read Employee (cf. /retraite,
  // question CH-RÔLES) — la résolution des noms se dégrade en matricules, la page
  // reste fonctionnelle.
  let byId: Record<string, string> = {};
  try {
    const emps = ids.length
      ? await resource<any[]>('Employee', ['name', 'employee_name'], { name: ['in', ids] })
      : [];
    byId = Object.fromEntries(emps.map((e) => [e.name, e.employee_name]));
  } catch {
    byId = {};
  }
  return rows.map((r) => ({ ...r, employee_name: byId[r.employee] ?? r.employee }));
};

/** Onboarding contraint : crée/complète un compte + rôles (whitelist back). */
export const provisionUser = (input: {
  email: string; full_name: string; roles: string[]; employee?: string;
}): Promise<{ user: string; roles: string[]; employee: string | null }> =>
  writeMethod('benin_hr.api.provisioning.provision_user', input);

/** Édition d'un paramètre de paie (config — Gestion-SM/admin ; POST + CSRF). */
export const updatePayrollParameter = (parameter_key: string, parameter_value: string): Promise<{ parameter_key: string; parameter_value: string }> =>
  writeMethod('benin_hr.api.config.update_payroll_parameter', { parameter_key, parameter_value });

/** Simulateur de séparation (lecture : préavis + indemnité + cas protégés). */
export const previewSeparation = (employee: string, separation_type: string, reason = ''): Promise<any> =>
  method('benin_hr.api.separation.preview_separation', { employee_name: employee, separation_type, reason });

// ---- Retraite (Lot 3 / 3.6) : suivi HR-administré (lecture) ----
// Le SIRH SUIT (âge, mois cotisés, éligibilité, relevé) ; la CNSS CALCULE la
// pension (réf. A7). retirement_status renvoie {employee, error} (HTTP 200) si
// paramètres/date de naissance absents (pattern L6a). La vue COHORTE
// (check_retirement_alerts) n'est PAS whitelistée → BACK-GAP (aucun getter ici).

export type RetirementStatus =
  | {
      employee: string; date_of_birth: string; age: number;
      legal_retirement_date: string; months_to_retirement: number; retired: boolean;
      months_contributed: number; eligibility: 'pension' | 'allocation' | 'aucun';
      early_retirement_possible: boolean; error?: undefined;
    }
  | { employee: string; error: string; date_of_birth?: string | null };

export type CareerLine = { period: string; brut: number; cnss_salarie: number };
export type CareerStatement = {
  employee: string; mois_cotises: number;
  total_brut_cotise: number; total_cnss_salarie: number; lignes: CareerLine[];
};

/** Statut retraite d'un salarié (lecture ; only_for RH/paie/dir au back). */
export const getRetirementStatus = (employee: string, reference_date?: string): Promise<RetirementStatus> =>
  method('benin_hr.api.retirement.retirement_status', reference_date ? { employee, reference_date } : { employee });

/** Relevé de carrière (pré-constitution dossier CNSS ; lecture). */
export const getCareerStatement = (employee: string): Promise<CareerStatement> =>
  method('benin_hr.api.retirement.career_statement', { employee });

// ---- M0-③④ : cohorte retraite + référentiel composantes (lecture gated) ----
export type RetirementCohort = {
  alert_months_before?: number; reference_date?: string;
  alertes: Array<{ employee: string; employee_name: string; legal_retirement_date: string;
    months_to_retirement: number; overdue: boolean }>;
  incomplets: Array<{ employee: string; employee_name?: string; error: string }>;
  error?: string; missing?: string[];
};

/** Cohorte d'approche retraite — le SEUIL vient de la réponse (jamais codé front). */
export const getRetirementCohort = (): Promise<RetirementCohort> =>
  method('benin_hr.api.retirement.retirement_cohort');

/** Référentiel des composantes (Department natif, D05 §5) — méthode gated only_for. */
export const getComposantes = async (): Promise<string[]> =>
  (await method<{ composantes: string[] }>('benin_hr.api.referentiels.list_composantes'))?.composantes ?? [];

/** Génération d'une déclaration/état social à la demande. POST (et non GET) :
 *  les sorties csv/pdf INSÈRENT un doc File privé — en GET, Frappe rollback la
 *  transaction en fin de requête et la download_url renvoyée pointe dans le vide
 *  (403). Le POST (CSRF forwardé) committe le File. */
export const generateDeclaration = (methodName: string, params: Record<string, string>): Promise<any> =>
  writeMethod(`benin_hr.api.declarations.${methodName}`, params);

// ---- CH-FRONT-DECL : factures externes (guichet unique DEC-38) ----
const FEXT = 'benin_hr.api.ess_facture';

export type FactureExterne = {
  name: string; beneficiaire: string; beneficiaire_nom: string;
  type_beneficiaire?: 'Vacataire' | 'Prestataire' | string;
  montant: number; periode: string; date_facture?: string;
  reference_piece?: string; piece_jointe?: string;
  statut: 'Soumise' | 'A transmettre' | 'Transmise' | 'Rejetee';
  validated_by?: string; integration_log?: string; transmis_le?: string; creation?: string;
};
export type FactureDecision = { name: string; statut: string; idempotency_key?: string };
export type FactureTransmission = {
  ok: boolean; statut: string; purchase_invoice?: string; supplier?: string;
  integration_log?: string; idempotent?: boolean; reason?: string;
};

/** File des factures externes (lecture REST scopée par les DocPerms back :
 *  HR User / Director / System Manager) + jointure légère des bénéficiaires. */
export const getFacturesExternes = async (): Promise<FactureExterne[]> => {
  const rows = await resource<any[]>(
    'Facture Externe',
    ['name', 'beneficiaire', 'type_beneficiaire', 'montant', 'periode', 'date_facture',
     'reference_piece', 'piece_jointe', 'statut', 'validated_by', 'integration_log',
     'transmis_le', 'creation'],
    {}, 'creation desc',
  );
  const benefIds = [...new Set(rows.map((r) => r.beneficiaire).filter(Boolean))];
  const benefs = benefIds.length
    ? await resource<any[]>('Beneficiaire Externe', ['name', 'nom_complet', 'type_beneficiaire'], { name: ['in', benefIds] })
    : [];
  const byId = Object.fromEntries(benefs.map((b) => [b.name, b]));
  return rows.map((r) => ({
    ...r,
    beneficiaire_nom: byId[r.beneficiaire]?.nom_complet ?? r.beneficiaire,
    type_beneficiaire: r.type_beneficiaire || byId[r.beneficiaire]?.type_beneficiaire || '',
  }));
};

/** Validation (→ « A transmettre ») ou rejet d'une facture externe. SoD back. */
export const decideFacture = (name: string, approve: boolean): Promise<FactureDecision> =>
  writeMethod(`${FEXT}.decide_facture`, { name, approve });

/** Transmission à UF (le back crée la PI en brouillon — STOP avant paiement).
 *  ok:false = rejouable (UF indisponible / refus) : la facture reste « A transmettre ». */
export const transmettreFacture = (name: string): Promise<FactureTransmission> =>
  writeMethod(`${FEXT}.transmettre_facture`, { name });

// ---- Bénéficiaires externes (P6-02, amont DEC-38) : CRUD léger REST + CSRF ----
// Data-in/out via /api/resource (DocPerm back : HR User r/w/c, Director r, System
// Manager r/w/c/d). Aucun champ d'accès/compte (frontière O2, DEC-40) : le doctype
// n'en porte pas. La validate() back reste l'autorité (nom requis ; IFU si
// Prestataire ; composante si Vacataire).

export type BeneficiaireExterne = {
  name: string;
  type_beneficiaire: 'Vacataire' | 'Prestataire' | string;
  nom_complet: string;
  ifu?: string; npi?: string;
  contact_email?: string; contact_tel?: string;
  composante?: string; discipline?: string;
  reference_supplier_uf?: string;
  statut_beneficiaire: 'Actif' | 'Archive' | string;
  creation?: string;
};
export type BeneficiaireInput = {
  name?: string;
  type_beneficiaire: 'Vacataire' | 'Prestataire';
  nom_complet: string;
  ifu?: string; npi?: string;
  contact_email?: string; contact_tel?: string;
  composante?: string; discipline?: string;
};

/** Jeton CSRF de la session (même source que writeMethod). */
async function csrfToken(): Promise<string> {
  const r = await method<{ csrf_token: string }>('benin_hr.api.cockpit.get_csrf_token');
  return r?.csrf_token ?? '';
}

/** Création REST d'un doc (POST /api/resource/<doctype>) — CSRF + session. */
async function resourceCreate<T = any>(doctype: string, doc: Record<string, unknown>): Promise<T> {
  const csrf = await csrfToken();
  const res = await fetch(`${BASE}/resource/${encodeURIComponent(doctype)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Frappe-CSRF-Token': csrf, ...authHeaders() },
    body: JSON.stringify(doc),
  });
  if (!res.ok) throw new Error(`benin_hr ${doctype} POST → ${res.status}`);
  return (await res.json()).data as T;
}

/** Mise à jour REST d'un doc (PUT /api/resource/<doctype>/<name>) — CSRF + session. */
async function resourceUpdate<T = any>(doctype: string, name: string, patch: Record<string, unknown>): Promise<T> {
  const csrf = await csrfToken();
  const res = await fetch(`${BASE}/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Frappe-CSRF-Token': csrf, ...authHeaders() },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`benin_hr ${doctype}/${name} PUT → ${res.status}`);
  return (await res.json()).data as T;
}

const BENEF = 'Beneficiaire Externe';

/** Annuaire des bénéficiaires externes (lecture REST scopée DocPerm). */
export const getBeneficiaires = (): Promise<BeneficiaireExterne[]> =>
  resource<BeneficiaireExterne[]>(
    BENEF,
    ['name', 'type_beneficiaire', 'nom_complet', 'ifu', 'npi', 'contact_email',
     'contact_tel', 'composante', 'discipline', 'reference_supplier_uf',
     'statut_beneficiaire', 'creation'],
    {}, 'creation desc',
  );

/** Création (si pas de `name`) ou mise à jour d'un bénéficiaire. Le back valide
 *  (nom ; IFU si Prestataire ; composante si Vacataire). Jamais de statut à la
 *  création (défaut back = Actif) ni de reference_supplier_uf (peuplée à la
 *  transmission de facture). */
export const saveBeneficiaire = async (input: BeneficiaireInput): Promise<{ name: string; statut_beneficiaire: string }> => {
  const { name, ...doc } = input;
  const saved = name
    ? await resourceUpdate<BeneficiaireExterne>(BENEF, name, doc)
    : await resourceCreate<BeneficiaireExterne>(BENEF, doc);
  return { name: saved.name, statut_beneficiaire: saved.statut_beneficiaire };
};

/** Bascule du cycle de vie RH local (Actif ⇄ Archive). PAS une suppression, PAS un
 *  statut d'accès (frontière O2, DEC-40). */
export const setBeneficiaireStatut = async (name: string, statut_beneficiaire: 'Actif' | 'Archive'): Promise<{ name: string; statut_beneficiaire: string }> => {
  const saved = await resourceUpdate<BeneficiaireExterne>(BENEF, name, { statut_beneficiaire });
  return { name: saved.name, statut_beneficiaire: saved.statut_beneficiaire };
};

// ---- Étape 3 : réquisitions d'embauche (demande → validation → création) ----
const ONB = 'benin_hr.api.onboarding';

export type OnboardingRequest = {
  name: string; candidate_name: string; candidate_email?: string;
  designation?: string; department?: string;
  status: 'Demande' | 'Validee' | 'Creee' | 'Rejetee';
  requested_by: string; validated_by?: string; created_employee?: string;
  reason?: string; rejection_reason?: string; creation: string;
};
export type OnboardingContext = {
  requests: OnboardingRequest[];
  can_request: boolean; can_validate: boolean; can_create: boolean;
  current_user: string;
  genders: string[]; companies: string[]; default_company: string | null;
};

/** Contexte role-aware de l'écran de recrutement (liste scopée + drapeaux + méta). */
export const getOnboardingRequests = (): Promise<OnboardingContext> =>
  method(`${ONB}.get_onboarding_requests`);

/** Le manager (ou HR/Directeur) initie une demande d'embauche. */
export const createOnboardingRequest = (input: {
  candidate_name: string; candidate_email?: string; designation?: string;
  department?: string; reason?: string;
}): Promise<{ name: string; status: string }> =>
  writeMethod(`${ONB}.create_onboarding_request`, input);

/** Le Directeur valide/refuse une demande (four-eyes : ≠ demandeur — gardé au back). */
export const decideOnboardingRequest = (
  name: string, approve: boolean, rejection_reason?: string,
): Promise<{ name: string; status: string }> =>
  writeMethod(`${ONB}.validate_onboarding_request`, { name, approve, rejection_reason });

/** Le gestionnaire RH crée le dossier depuis une demande validée (≠ validateur — gardé au back). */
export const createEmployeeFromRequest = (input: {
  name: string; person_id: string; gender: string; date_of_birth: string;
  date_of_joining?: string; company?: string;
}): Promise<{ name: string; status: string; employee: string }> =>
  writeMethod(`${ONB}.create_employee_from_request`, input);

// ---- Étape 4 : gouvernance des accès privilégiés (journal + revue, G4) ----
const AG = 'benin_hr.api.access_governance';

export type AccessEvent = {
  name: string; user: string; action: string;
  reference_doctype?: string; reference_name?: string;
  role_context?: string; ip_address?: string; creation: string;
};
export type AccessHolder = {
  user: string; full_name: string; roles: string[];
  enabled: boolean; last_active?: string; last_login?: string;
};
export type AccessReviewContext = {
  holders: AccessHolder[]; holder_count: number;
  last_review: { name: string; reviewed_by: string; review_date: string; holder_count: number } | null;
  last_review_age_days: number | null; overdue: boolean;
  review_interval_days: number; sensitive_roles: string[];
};

/** Journal des accès privilégiés récents (oversight : Admin SI / Direction). */
export const getAccessAudit = (): Promise<{ events: AccessEvent[]; audited_role: string }> =>
  method(`${AG}.get_access_audit`);

/** Contexte de revue : détenteurs de rôles sensibles + état de la dernière revue. */
export const getAccessReview = (): Promise<AccessReviewContext> =>
  method(`${AG}.get_access_review`);

/** Atteste qu'une revue des accès a eu lieu (ISO 8.2 — POST + CSRF). */
export const recordAccessReview = (notes?: string): Promise<{ name: string; review_date: string; holder_count: number }> =>
  writeMethod(`${AG}.record_access_review`, { notes });

const initials = (s: string) =>
  (s || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
const fcfa = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} FCFA`;

export const frappeSource: RhDataSource = {
  // KPIs composés des agrégats analytics (pas de méthode get_rh_kpis dédiée).
  getKpis: async () => {
    const year = String(new Date().getFullYear());
    const [hc, agg] = await Promise.all([
      method<any>('benin_hr.api.analytics.headcount'),
      method<any>('benin_hr.api.analytics.payroll_aggregates', { year }),
    ]);
    const t = agg?.total ?? {};
    return [
      { id: 'effectif', label: 'Effectif actif', value: String(hc?.total ?? 0), roles: ['manager', 'gest_rh', 'dir', 'admin'] },
      { id: 'masse', label: `Masse salariale ${year}`, value: fcfa(t.masse_brute ?? 0), roles: ['paie', 'finance', 'dir', 'admin'] },
      { id: 'cout', label: `Coût employeur ${year}`, value: fcfa(t.cout_employeur ?? 0), roles: ['finance', 'dir', 'admin'] },
      { id: 'net', label: `Net versé ${year}`, value: fcfa(t.masse_nette ?? 0), roles: ['paie', 'finance', 'admin'] },
    ] as RhKpi[];
  },

  getDirectory: async () => {
    const rows = await resource<any[]>('Employee', ['name', 'employee_name', 'department', 'designation', 'status', 'company_email']);
    return rows.map((e): DirectoryEmployee => ({
      id: e.name, employeeName: e.employee_name ?? '', department: e.department ?? '',
      designation: e.designation ?? '', status: (e.status ?? 'Active') as EmployeeStatus,
      contractType: null, initials: initials(e.employee_name ?? ''), companyEmail: e.company_email ?? '',
    }));
  },

  getEmployee: async (id) => {
    const rows = await resource<any[]>('Employee', ['name', 'employee_name', 'department', 'designation', 'status', 'company_email'], { name: id });
    const e = rows[0] ?? {};
    return {
      id: e.name ?? id, employeeName: e.employee_name ?? '', department: e.department ?? '',
      designation: e.designation ?? '', status: (e.status ?? 'Active') as EmployeeStatus,
      contractType: null, initials: initials(e.employee_name ?? ''), companyEmail: e.company_email ?? '',
    };
  },

  getContracts: async () => {
    const rows = await resource<any[]>('Localized Contract',
      ['name', 'employee', 'contract_type', 'start_date', 'end_date', 'probation_end_date', 'payroll_profile', 'base_salary', 'status']);
    return rows.map((c): Contract => ({
      id: c.name, employee: c.employee, employeeName: '', contractType: c.contract_type as ContractType,
      startDate: c.start_date, endDate: c.end_date ?? null, probationEndDate: c.probation_end_date ?? null,
      payrollProfile: c.payroll_profile ?? null, baseSalary: c.base_salary ?? 0, status: c.status as ContractStatus,
    }));
  },

  getPayrollRuns: async () => {
    const rows = await resource<any[]>('Payroll Run',
      ['name', 'period_month', 'period_year', 'status', 'total_gross', 'total_net'], {}, 'period_year desc, period_month desc');
    return rows.map((r): PayrollRun => ({
      id: r.name, periodMonth: r.period_month, periodYear: r.period_year, status: r.status as PayrollRunStatus,
      totalGross: r.total_gross ?? 0, totalNet: r.total_net ?? 0, totalEmployerCost: 0,
      slipCount: 0, erpTransmissionDate: null,
    }));
  },

  getPayrollSlips: async (runId) => {
    const rows = await resource<any[]>('Payroll Slip',
      ['name', 'employee', 'gross_salary', 'cnss_employee', 'cnss_employer', 'pf_employer', 'rp_employer', 'taxable_base', 'its_amount', 'other_deductions', 'net_salary', 'employer_total_cost'],
      { payroll_run: runId });
    return rows.map((s): PayrollSlipRow => ({
      id: s.name, employee: s.employee, employeeName: '', grossSalary: s.gross_salary ?? 0,
      cnssEmployee: s.cnss_employee ?? 0, cnssEmployer: s.cnss_employer ?? 0, pfEmployer: s.pf_employer ?? 0,
      rpEmployer: s.rp_employer ?? 0, taxableBase: s.taxable_base ?? 0, itsAmount: s.its_amount ?? 0,
      otherDeductions: s.other_deductions ?? 0, netSalary: s.net_salary ?? 0, employerTotalCost: s.employer_total_cost ?? 0,
    }));
  },

  // Validations = campagnes de paie en attente (workflow finance → direction).
  getValidations: async () => {
    const rows = await resource<any[]>('Payroll Run',
      ['name', 'period_month', 'period_year', 'status', 'total_net', 'modified', 'modified_by'],
      { status: ['in', ['Preparation', 'Validee finance']] }, 'modified desc');
    return rows.map((r): ValidationItem => ({
      runId: r.name, period: `${r.period_month}/${r.period_year}`,
      stage: r.status === 'Preparation' ? 'finance' : 'direction',
      totalNet: r.total_net ?? 0, totalEmployerCost: 0, slipCount: 0,
      submittedOn: r.modified ?? '', submittedBy: r.modified_by ?? '',
    }));
  },

  // BACK-GAP : pas de suivi PERSISTANT des déclarations (elles se GÉNÈRENT à la
  // demande via declarations.generate_cnss/its/vps_declaration, _annual_recap,
  // _salary_register, _nominative_declaration). La page déclarations doit appeler
  // ces méthodes par période. TODO back : un doctype « Declaration » de suivi si
  // un statut a_produire/genere/transmis est requis.
  getDeclarations: async (): Promise<Declaration[]> => [],

  // BACK-GAP : évaluations = `teaching_eval`, pas benin_hr.
  getEvaluations: async (): Promise<RhEvaluation[]> => [],

  // Pas de doctype/historique de séparations persistées (separation.py ne persiste rien).
  // F1 a exposé `separation.preview_separation(employee, type, reason)` (whitelisté, RH) :
  // l'écran RH devient un SIMULATEUR (préavis + indemnité + cas protégés, lecture seule)
  // câblé en F3 via une méthode dédiée. La liste d'historique reste sans source (vide).
  getSeparations: async (): Promise<Separation[]> => [],

  // BACK-GAP : pas de modèles de documents côté benin_hr.
  getDocumentTemplates: async (): Promise<DocumentTemplate[]> => [],

  getPayrollParameters: async () => {
    const rows = await resource<any[]>('Payroll Parameter', ['parameter_key', 'parameter_value'], { is_active: 1 }, 'parameter_key asc');
    return rows.map((p): PayrollParameter => ({
      key: p.parameter_key, label: p.parameter_key, value: String(p.parameter_value ?? ''),
      unit: null, group: (p.parameter_key ?? '').split('.')[1] ?? 'PAYROLL',
    }));
  },
};
