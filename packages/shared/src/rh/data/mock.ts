/* ============================================================
   @emela/shared — Jeu de données RH de démonstration (typé).
   Remplacé par le client Frappe en production (voir ../client/frappe.ts).
   Valeurs et statuts alignés sur les doctypes réels de benin_hr.
   ============================================================ */
import type {
  RhKpi, DirectoryEmployee, Contract, PayrollRun, PayrollSlipRow, ValidationItem,
  Declaration, RhEvaluation, Separation, DocumentTemplate, PayrollParameter,
} from '../types';

export const kpis: RhKpi[] = [
  { id: 'headcount', label: 'Effectif actif',          value: '247',          trend: '+3 ce mois',     trendUp: true,  roles: ['manager', 'gest_rh', 'dir', 'admin'] },
  { id: 'contracts_end', label: 'CDD à échéance < 60j', value: '6',            trend: '2 à renouveler', trendUp: false, roles: ['gest_rh', 'dir', 'admin'] },
  { id: 'payroll_net', label: 'Masse nette — mai 2026', value: '118,4 M F',    trend: '+1,2 %',         trendUp: true,  roles: ['paie', 'finance', 'dir', 'admin'] },
  { id: 'employer_cost', label: 'Coût employeur — mai', value: '142,7 M F',    trend: 'stable',         trendUp: true,  roles: ['paie', 'finance', 'dir', 'admin'] },
  { id: 'pending_val', label: 'Validations en attente', value: '2',            trend: 'finance + dir.', trendUp: false, roles: ['manager', 'finance', 'dir', 'admin'] },
  { id: 'evals_due', label: 'Évaluations à mener',      value: '14',           trend: 'campagne 2026',  trendUp: false, roles: ['manager', 'gest_rh', 'dir', 'admin'] },
];

export const directory: DirectoryEmployee[] = [
  { id: 'HR-EMP-0042', employeeName: 'Mahougnon Akplogan', department: 'Informatique', designation: 'Maître-assistant', status: 'Active', contractType: 'CDI', initials: 'MA', companyEmail: 'mahougnon.akplogan@lanem.bj' },
  { id: 'HR-EMP-0043', employeeName: 'Gisèle Fanou', department: 'Informatique', designation: 'Assistante', status: 'Active', contractType: 'CDD', initials: 'GF', companyEmail: 'gisele.fanou@lanem.bj' },
  { id: 'HR-EMP-0051', employeeName: 'Pascal Tchégnon', department: 'Sciences', designation: 'Technicien de laboratoire', status: 'Active', contractType: 'CDI', initials: 'PT', companyEmail: 'pascal.tchegnon@lanem.bj' },
  { id: 'HR-EMP-0067', employeeName: 'Nadège Kpodo', department: 'Informatique', designation: 'Maître-assistant', status: 'Active', contractType: 'CDI', initials: 'NK', companyEmail: 'nadege.kpodo@lanem.bj' },
  { id: 'HR-EMP-0072', employeeName: 'Ismaël Bio Tchané', department: 'Lettres', designation: 'Enseignant vacataire', status: 'Active', contractType: 'Temps partiel', initials: 'IB', companyEmail: 'ismael.biotchane@lanem.bj' },
  { id: 'HR-EMP-0088', employeeName: 'Adrienne Gomez', department: 'Administration', designation: 'Assistante administrative', status: 'Active', contractType: 'CDI', initials: 'AG', companyEmail: 'adrienne.gomez@lanem.bj' },
  { id: 'HR-EMP-0094', employeeName: 'Daniel Sossou', department: 'Sciences', designation: 'Apprenti', status: 'Active', contractType: 'Apprentissage', initials: 'DS', companyEmail: 'daniel.sossou@lanem.bj' },
  { id: 'HR-EMP-0101', employeeName: 'Fatima Al-Hassan', department: 'Lettres', designation: 'Professeure invitée', status: 'Suspended', contractType: 'Etranger', initials: 'FA', companyEmail: 'fatima.alhassan@lanem.bj' },
];

export const contracts: Contract[] = [
  { id: 'CTRX-2019-00318', employee: 'HR-EMP-0042', employeeName: 'Mahougnon Akplogan', contractType: 'CDI', startDate: '2019-10-01', endDate: null, probationEndDate: '2020-01-01', payrollProfile: 'Enseignant-chercheur', baseSalary: 485000, status: 'Actif' },
  { id: 'CTRX-2025-00204', employee: 'HR-EMP-0043', employeeName: 'Gisèle Fanou', contractType: 'CDD', startDate: '2025-09-01', endDate: '2026-08-31', probationEndDate: '2025-10-01', payrollProfile: 'Personnel administratif', baseSalary: 220000, status: 'Actif' },
  { id: 'CTRX-2021-00112', employee: 'HR-EMP-0051', employeeName: 'Pascal Tchégnon', contractType: 'CDI', startDate: '2021-03-15', endDate: null, probationEndDate: '2021-06-15', payrollProfile: 'Technique', baseSalary: 295000, status: 'Actif' },
  { id: 'CTRX-2026-00031', employee: 'HR-EMP-0072', employeeName: 'Ismaël Bio Tchané', contractType: 'Temps partiel', startDate: '2026-01-10', endDate: '2026-12-31', probationEndDate: null, payrollProfile: 'Vacataire', baseSalary: 145000, status: 'Actif' },
  { id: 'CTRX-2026-00045', employee: 'HR-EMP-0094', employeeName: 'Daniel Sossou', contractType: 'Apprentissage', startDate: '2026-02-01', endDate: '2027-01-31', probationEndDate: null, payrollProfile: 'Apprenti', baseSalary: 90000, status: 'Actif' },
  { id: 'CTRX-2024-00377', employee: 'HR-EMP-0101', employeeName: 'Fatima Al-Hassan', contractType: 'Etranger', startDate: '2024-10-01', endDate: '2026-06-30', probationEndDate: null, payrollProfile: 'Enseignant-chercheur', baseSalary: 620000, status: 'Suspendu' },
];

export const payrollRuns: PayrollRun[] = [
  { id: 'PAY-2026-05-00001', periodMonth: '05', periodYear: '2026', status: 'Validee finance', totalGross: 151200000, totalNet: 118400000, totalEmployerCost: 142700000, slipCount: 247, erpTransmissionDate: null },
  { id: 'PAY-2026-04-00001', periodMonth: '04', periodYear: '2026', status: 'Transmise ERPNext', totalGross: 150100000, totalNet: 117200000, totalEmployerCost: 141600000, slipCount: 245, erpTransmissionDate: '2026-04-30 18:24:00' },
  { id: 'PAY-2026-03-00001', periodMonth: '03', periodYear: '2026', status: 'Transmise ERPNext', totalGross: 149800000, totalNet: 116900000, totalEmployerCost: 141200000, slipCount: 244, erpTransmissionDate: '2026-03-31 17:50:00' },
  { id: 'PAY-2026-06-00001', periodMonth: '06', periodYear: '2026', status: 'Preparation', totalGross: 0, totalNet: 0, totalEmployerCost: 0, slipCount: 0, erpTransmissionDate: null },
];

const slip = (id: string, employee: string, employeeName: string, gross: number): PayrollSlipRow => {
  const cnssEmployee = Math.round(gross * 0.036);
  const cnssEmployer = Math.round(gross * 0.064);
  const pfEmployer = Math.round(gross * 0.09);
  const rpEmployer = Math.round(gross * 0.01);
  const taxableBase = gross - cnssEmployee;
  const itsAmount = Math.round(taxableBase * 0.163);
  const otherDeductions = 1000;
  const netSalary = gross - cnssEmployee - itsAmount - otherDeductions;
  const employerTotalCost = gross + cnssEmployer + pfEmployer + rpEmployer;
  return { id, employee, employeeName, grossSalary: gross, cnssEmployee, cnssEmployer, pfEmployer, rpEmployer, taxableBase, itsAmount, otherDeductions, netSalary, employerTotalCost };
};

export const payrollSlips: Record<string, PayrollSlipRow[]> = {
  'PAY-2026-05-00001': [
    slip('SLIP-2026-05-00042', 'HR-EMP-0042', 'Mahougnon Akplogan', 612400),
    slip('SLIP-2026-05-00043', 'HR-EMP-0043', 'Gisèle Fanou', 248000),
    slip('SLIP-2026-05-00051', 'HR-EMP-0051', 'Pascal Tchégnon', 332500),
    slip('SLIP-2026-05-00067', 'HR-EMP-0067', 'Nadège Kpodo', 598000),
    slip('SLIP-2026-05-00072', 'HR-EMP-0072', 'Ismaël Bio Tchané', 162000),
    slip('SLIP-2026-05-00088', 'HR-EMP-0088', 'Adrienne Gomez', 286000),
  ],
};

export const validations: ValidationItem[] = [
  { runId: 'PAY-2026-05-00001', period: 'Mai 2026', stage: 'direction', totalNet: 118400000, totalEmployerCost: 142700000, slipCount: 247, submittedOn: '2026-05-28', submittedBy: 'Bertin Aïkpé' },
  { runId: 'PAY-2026-06-00001', period: 'Juin 2026', stage: 'finance', totalNet: 0, totalEmployerCost: 0, slipCount: 0, submittedOn: '2026-06-15', submittedBy: 'Bertin Aïkpé' },
];

export const declarations: Declaration[] = [
  { id: 'CNSS-2026-T1', kind: 'cnss', period: 'T1', year: '2026', label: 'CNSS — 1ᵉʳ trimestre 2026', base: 449700000, amount: 76449000, status: 'transmis', legalRef: 'Loi n° 98-019 du 15 décembre 1998 (Code de Sécurité Sociale)' },
  { id: 'ITS-2026-04', kind: 'its', period: '04', year: '2026', label: 'ITS — Avril 2026', base: 144700000, amount: 23586000, status: 'transmis', legalRef: 'CGI Bénin — Article 125' },
  { id: 'ITS-2026-05', kind: 'its', period: '05', year: '2026', label: 'ITS — Mai 2026', base: 145800000, amount: 23765000, status: 'genere', legalRef: 'CGI Bénin — Article 125' },
  { id: 'CNSS-2026-T2', kind: 'cnss', period: 'T2', year: '2026', label: 'CNSS — 2ᵉ trimestre 2026', base: 0, amount: 0, status: 'a_produire', legalRef: 'Loi n° 98-019 du 15 décembre 1998 (Code de Sécurité Sociale)' },
];

export const evaluations: RhEvaluation[] = [
  { id: 'EVAL-2026-0042', employee: 'HR-EMP-0042', employeeName: 'Mahougnon Akplogan', department: 'Informatique', campaign: 'Campagne 2026', score: '4,2/5', status: 'validee', dueDate: '2026-01-31' },
  { id: 'EVAL-2026-0067', employee: 'HR-EMP-0067', employeeName: 'Nadège Kpodo', department: 'Informatique', campaign: 'Campagne 2026', score: null, status: 'en_cours', dueDate: '2026-07-15' },
  { id: 'EVAL-2026-0051', employee: 'HR-EMP-0051', employeeName: 'Pascal Tchégnon', department: 'Sciences', campaign: 'Campagne 2026', score: null, status: 'planifiee', dueDate: '2026-07-30' },
  { id: 'EVAL-2026-0088', employee: 'HR-EMP-0088', employeeName: 'Adrienne Gomez', department: 'Administration', campaign: 'Campagne 2026', score: null, status: 'planifiee', dueDate: '2026-08-12' },
];

export const separations: Separation[] = [
  { id: 'SEP-2026-0007', employee: 'HR-EMP-0355', employeeName: 'Akpovi Dansou', matricule: 'PERS-00355', designation: 'Agent administratif', kind: 'licenciement', protected: true, protectionReason: 'Représentant du personnel — protection active', stage: 'autorisation', effectiveDate: '2026-07-31', noticeDays: 60, severance: 1280000 },
  { id: 'SEP-2026-0005', employee: 'HR-EMP-0489', employeeName: 'Florent Agbodjan', matricule: 'PERS-00489', designation: 'Agent administratif', kind: 'fin_contrat', protected: false, stage: 'documents', effectiveDate: '2026-02-28', noticeDays: 0, severance: null },
  { id: 'SEP-2026-0004', employee: 'HR-EMP-0210', employeeName: 'Romaric Dossou-Yovo', matricule: 'PERS-00210', designation: 'Maître de conférences', kind: 'retraite', protected: false, stage: 'finalisation', effectiveDate: '2026-06-30', noticeDays: 90, severance: 3450000 },
];

export const documentTemplates: DocumentTemplate[] = [
  { id: 'TPL-attestation-travail', title: 'Attestation de travail', category: 'Attestations', icon: 'i-stamp', updatedOn: '2026-03-12', variables: 6 },
  { id: 'TPL-attestation-assiduite', title: "Attestation d'assiduité", category: 'Attestations', icon: 'i-stamp', updatedOn: '2026-03-12', variables: 7 },
  { id: 'TPL-attestation-mission', title: "Attestation de bonne exécution de mission d'enseignement", category: 'Attestations', icon: 'i-stamp', updatedOn: '2026-04-02', variables: 9 },
  { id: 'TPL-certificat-travail', title: 'Certificat de travail', category: 'Sortie', icon: 'i-badge', updatedOn: '2026-02-20', variables: 8 },
  { id: 'TPL-solde-tout-compte', title: 'Solde de tout compte', category: 'Sortie', icon: 'i-coins', updatedOn: '2026-02-20', variables: 12 },
  { id: 'TPL-contrat-cdi', title: 'Contrat de travail — CDI', category: 'Contrats', icon: 'i-doc', updatedOn: '2026-01-15', variables: 14 },
];

export const payrollParameters: PayrollParameter[] = [
  { key: 'PAYROLL.CNSS.SALARIE_RATE', label: 'CNSS — part salariale', value: '3,6', unit: '%', group: 'CNSS' },
  { key: 'PAYROLL.CNSS.PATRONAL_VIEILLESSE_RATE', label: 'CNSS — part patronale (vieillesse)', value: '6,4', unit: '%', group: 'CNSS' },
  { key: 'PAYROLL.CNSS.PRESTATIONS_FAMILIALES_RATE', label: 'Prestations familiales', value: '9', unit: '%', group: 'CNSS' },
  { key: 'PAYROLL.CNSS.RISQUES_PRO_RATE', label: 'Risques professionnels', value: '1', unit: '%', group: 'CNSS' },
  { key: 'PAYROLL.ITS.BAREME', label: 'Barème ITS', value: 'Barème progressif 2025', unit: null, group: 'ITS' },
  { key: 'PAYROLL.CONVENTION_COLLECTIVE', label: 'Convention collective', value: 'Enseignement supérieur privé', unit: null, group: 'Convention' },
];
