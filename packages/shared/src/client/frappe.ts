/* ============================================================
   @emela/shared — Client Frappe `benin_hr` (ESS) — RÉALIGNÉ sur le back RÉEL.
   ------------------------------------------------------------
   Implémente le contrat `DataSource` en ciblant UNIQUEMENT des endpoints
   qui EXISTENT dans benin_hr (vérifié 2026-06-21) :

   • Méthodes whitelistées cockpit (self-service) :
       get_hr_selfservice_summary, get_leave_summary,
       get_recent_requests, get_notifications_summary
   • Doctypes lus en REST /api/resource — déjà SCOPÉS « soi » par nos
       permission_query_conditions : Payroll Slip, Acompte, Note De Frais,
       Heures Supplementaires, Localized Contract. + Public Holiday, Leave
       Application (HRMS).

   Les getters sans source back native sont marqués « BACK-GAP » : ils
   renvoient un repli typé vide + un TODO précis, plutôt qu'un appel fictif.
   Activer depuis ../data/index.ts : const source = frappeSource.
   ============================================================ */
import type {
  DataSource, LeaveBalance, LeaveRequest, HrRequest, Payslip,
  Colleague, Notification, PayslipLine, HrDocument, PayslipDetail, Evaluation, CalendarEvent, Holiday,
} from '../types';

const BASE = (import.meta as any).env?.PUBLIC_FRAPPE_URL ?? '';
const COCKPIT = 'benin_hr.api.cockpit';

/** Appel d'une méthode whitelistée : /api/method/<dotted.path>. */
async function method<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE}/api/method/${path}${qs ? `?${qs}` : ''}`, {
    headers: { Accept: 'application/json' },
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`benin_hr ${path} → ${res.status}`);
  return (await res.json()).message as T;
}

/** Liste d'un doctype : /api/resource/<Doctype> (scopée par les permissions back). */
async function resource<T = any[]>(
  doctype: string, fields: string[], filters: Record<string, unknown> = {}, order_by = '',
): Promise<T> {
  const qs = new URLSearchParams({
    fields: JSON.stringify(fields),
    filters: JSON.stringify(filters),
    limit_page_length: '0',
    ...(order_by ? { order_by } : {}),
  }).toString();
  const res = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}?${qs}`, {
    headers: { Accept: 'application/json' }, credentials: 'include',
  });
  if (!res.ok) throw new Error(`benin_hr ${doctype} → ${res.status}`);
  return ((await res.json()).data ?? []) as T;
}

/** Un document précis : /api/resource/<Doctype>/<name>. */
async function doc<T = any>(doctype: string, name: string): Promise<T> {
  const res = await fetch(`${BASE}/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`, {
    headers: { Accept: 'application/json' }, credentials: 'include',
  });
  if (!res.ok) throw new Error(`benin_hr ${doctype}/${name} → ${res.status}`);
  return (await res.json()).data as T;
}

const initials = (s: string) =>
  (s || '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');

const REQUEST_STATUS: Record<string, HrRequest['status']> = {
  Demande: 'pending', Saisie: 'pending', Brouillon: 'pending',
  Approuve: 'approved', Validee: 'approved', Retenu: 'approved', Applique: 'approved',
  Rejete: 'rejected', Remboursee: 'reimbursed',
};
const mapReqStatus = (s: string): HrRequest['status'] => REQUEST_STATUS[s] ?? 'pending';

export const frappeSource: DataSource = {
  // Identité de session : le résumé self-service porte le nom du salarié.
  getCurrentUser: async () => {
    const s = await method<any>(`${COCKPIT}.get_hr_selfservice_summary`);
    return { name: s.employee_name ?? '', role: 'Salarié', initials: initials(s.employee_name ?? '') };
  },

  // Profil : champs disponibles via le résumé + le contrat. Les champs riches non
  // exposés par le back (faculty, familyStatus, emails perso, adresse, contact urgence)
  // restent vides — BACK-GAP : enrichir get_hr_selfservice_summary si l'écran les exige.
  getEmployee: async () => {
    const s = await method<any>(`${COCKPIT}.get_hr_selfservice_summary`);
    const c = s.contract ?? {};
    return {
      id: s.employee_id ?? '', firstName: (s.employee_name ?? '').split(' ')[0] ?? '',
      name: s.employee_name ?? '', initials: initials(s.employee_name ?? ''),
      position: s.designation ?? '', department: s.department ?? '', faculty: '',
      contractType: c.contract_type ?? '', contractSince: c.start_date ?? '',
      payProfile: c.payroll_profile ?? '', matricule: s.employee_id ?? '', cnss: '',
      manager: '', birthDate: '', familyStatus: '', proEmail: '', personalEmail: '',
      phone: '', address: '', emergencyContact: '',
    };
  },

  getLeaveBalances: async () => {
    const s = await method<any>(`${COCKPIT}.get_leave_summary`);
    return (s.leave_balance ?? []).map((b: any, i: number): LeaveBalance => ({
      id: b.leave_type ?? String(i), label: b.leave_type ?? '',
      remaining: b.remaining_days ?? 0, total: b.total_days ?? 0,
      tone: i === 0 ? 'accent' : 'ink',
    }));
  },

  // Congés : détail via REST Leave Application (HRMS gère le scope salarié).
  getLeaveRequests: async () => {
    const rows = await resource<any[]>('Leave Application',
      ['name', 'leave_type', 'from_date', 'to_date', 'total_leave_days', 'status'], {}, 'from_date desc');
    const ST: Record<string, LeaveRequest['status']> = { Open: 'pending', Approved: 'approved', Rejected: 'rejected', Cancelled: 'rejected' };
    return rows.map((r): LeaveRequest => ({
      id: r.name, type: r.leave_type, period: `${r.from_date} → ${r.to_date}`,
      days: r.total_leave_days ?? 0, status: ST[r.status] ?? 'pending',
    }));
  },

  // Demandes : fusion des doctypes self-service (scopés « soi » par les permissions).
  getRequests: async () => {
    const [acomptes, frais, hsup] = await Promise.all([
      resource<any[]>('Acompte', ['name', 'amount', 'request_date', 'status'], {}, 'request_date desc'),
      resource<any[]>('Note De Frais', ['name', 'amount', 'category', 'expense_date', 'status'], {}, 'expense_date desc'),
      resource<any[]>('Heures Supplementaires', ['name', 'amount', 'period_month', 'period_year', 'status'], {}, 'modified desc'),
    ]);
    const out: HrRequest[] = [];
    for (const a of acomptes) out.push({ id: a.name, subject: 'Acompte sur salaire', category: 'advance', date: a.request_date, amount: a.amount, status: mapReqStatus(a.status) });
    for (const f of frais) out.push({ id: f.name, subject: `Note de frais — ${f.category}`, category: 'expense', date: f.expense_date, amount: f.amount, status: mapReqStatus(f.status) });
    for (const h of hsup) out.push({ id: h.name, subject: `Heures supplémentaires ${h.period_month}/${h.period_year}`, category: 'expense', date: `${h.period_year}-${h.period_month}`, amount: h.amount, status: mapReqStatus(h.status) });
    return out;
  },

  // Bulletins : Payroll Slip self (scopé) + période depuis le Payroll Run.
  getPayslips: async () => {
    const slips = await resource<any[]>('Payroll Slip',
      ['name', 'payroll_run', 'gross_salary', 'its_amount', 'other_deductions', 'net_salary'], {}, 'creation desc');
    const runIds = [...new Set(slips.map((s) => s.payroll_run).filter(Boolean))];
    const runs = runIds.length
      ? await resource<any[]>('Payroll Run', ['name', 'period_month', 'period_year', 'status'], { name: ['in', runIds] })
      : [];
    const byRun: Record<string, any> = Object.fromEntries(runs.map((r) => [r.name, r]));
    return slips.map((s): Payslip => {
      const r = byRun[s.payroll_run] ?? {};
      return {
        id: s.name, period: r.period_year ? `${r.period_month}/${r.period_year}` : '',
        issuedOn: '', gross: s.gross_salary ?? 0, deductions: (s.its_amount ?? 0) + (s.other_deductions ?? 0),
        incomeTax: s.its_amount ?? 0, net: s.net_salary ?? 0,
        status: r.status === 'Generee' || r.status === 'Transmise ERPNext' ? 'available' : 'archived',
        year: Number(r.period_year) || 0,
      };
    });
  },

  // Détail bulletin : document Payroll Slip + journal de calcul + rubriques (child
  // table `components`). Le PDF officiel reste servi par le back.
  getPayslipDetail: async (id) => {
    const s = await doc<any>('Payroll Slip', id);
    let journal: { label: string; value: number }[] = [];
    try {
      const j = JSON.parse(s.calculation_journal ?? '{}');
      journal = Object.values(j)
        .filter((x: any) => x && x.label && typeof x.result === 'number')
        .map((x: any) => ({ label: x.label, value: x.result }));
    } catch { /* journal absent */ }
    const earnings: PayslipLine[] = (s.components ?? [])
      .filter((c: any) => c.kind !== 'Retenue')
      .map((c: any) => ({ label: c.label, amount: c.amount }));
    const deductionLines: PayslipLine[] = [
      { label: 'CNSS salariale', employee: s.cnss_employee ?? 0 },
      { label: 'ITS', employee: s.its_amount ?? 0 },
      { label: 'Autres retenues', employee: s.other_deductions ?? 0 },
    ];
    const deductionsTotal = (s.cnss_employee ?? 0) + (s.its_amount ?? 0) + (s.other_deductions ?? 0);
    return {
      id: s.name, period: '', issuedOn: '', gross: s.gross_salary ?? 0,
      deductions: deductionsTotal, incomeTax: s.its_amount ?? 0, net: s.net_salary ?? 0,
      status: 'available', year: 0,
      reference: s.name, periodLabel: '', employerCost: s.employer_total_cost ?? 0,
      earnings, deductionLines,
      totals: { employee: deductionsTotal, employer: s.employer_total_cost ?? 0 },
      journal,
    };
  },

  getNotifications: async () => {
    const n = await method<any>(`${COCKPIT}.get_notifications_summary`);
    return (n.notifications ?? []).map((x: any, i: number): Notification => ({
      id: x.id ?? String(i), icon: x.type === 'payroll_slip_available' ? 'i-file' : 'i-leave',
      tone: x.type === 'payroll_slip_available' ? 'pay' : 'leave',
      title: x.title ?? x.label ?? '', detail: x.detail ?? x.message ?? '',
    }));
  },

  getContract: async () => {
    const rows = await resource<any[]>('Localized Contract',
      ['name', 'contract_type', 'start_date', 'probation_end_date', 'base_salary', 'payroll_profile', 'status'],
      { status: 'Actif' }, 'start_date desc');
    const c = rows[0] ?? {};
    return {
      reference: c.name ?? '', payProfile: c.payroll_profile ?? '', startDate: c.start_date ?? '',
      trialPeriod: c.probation_end_date ?? '', baseSalary: c.base_salary ?? 0, seniority: '',
      history: rows.map((r) => ({ kind: r.contract_type ?? '', period: r.start_date ?? '', status: r.status ?? '', statusVariant: 'ink' })),
    };
  },

  getHolidays: async () => {
    const rows = await resource<any[]>('Public Holiday', ['holiday_name', 'holiday_date'], {}, 'holiday_date asc');
    return rows.map((r): Holiday => ({ date: r.holiday_date, name: r.holiday_name }));
  },

  getCalendarEvents: async () => {
    const [leaves, hols] = await Promise.all([
      resource<any[]>('Leave Application', ['from_date', 'to_date', 'leave_type', 'status'], {}, 'from_date asc'),
      resource<any[]>('Public Holiday', ['holiday_name', 'holiday_date'], {}, 'holiday_date asc'),
    ]);
    const ev: CalendarEvent[] = leaves.map((l) => ({ start: l.from_date, end: l.to_date, label: l.leave_type, kind: l.status === 'Approved' ? 'leave' : 'pending' }));
    for (const h of hols) ev.push({ start: h.holiday_date, end: h.holiday_date, label: h.holiday_name, kind: 'hol' });
    return ev;
  },

  // BACK-GAP : présence d'équipe (aucune méthode back ; nécessiterait HRMS Attendance).
  // TODO back : cockpit.get_colleagues (équipe + présence du jour).
  getColleagues: async (): Promise<Colleague[]> => [],

  // BACK-GAP : référentiel de documents RH téléchargeables (pas de doctype dédié).
  // TODO back : get_documents (bulletins PDF, attestations, certificats).
  getDocuments: async (): Promise<HrDocument[]> => [],

  // BACK-GAP : les évaluations relèvent de `teaching_eval`, pas de benin_hr.
  // TODO : brancher teaching_eval ou retirer l'écran du périmètre SIRH.
  getEvaluations: async (): Promise<Evaluation[]> => [],
};
