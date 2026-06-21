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

const BASE = '/api';

async function method<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/method/${path}${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' }, credentials: 'include',
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
    headers: { Accept: 'application/json' }, credentials: 'include',
  });
  if (!res.ok) throw new Error(`benin_hr ${doctype} → ${res.status}`);
  return ((await res.json()).data ?? []) as T;
}

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

  // BACK-GAP : pas de doctype/liste de séparations (separation.py = fonctions sans
  // whitelist : initiate/finalize/calculate). TODO back : exposer une liste des
  // séparations en cours (ou dériver des Employee status=Left + contrat Resilie).
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
