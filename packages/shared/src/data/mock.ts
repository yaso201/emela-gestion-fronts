/* ============================================================
   @emela/shared — Jeu de données de démonstration (typé).
   Remplacé par le client Frappe en production (voir ../client/frappe.ts).
   ============================================================ */
import type { Employee, CurrentUser, LeaveBalance, LeaveRequest, HrRequest, Payslip, Colleague, Notification, Contract, HrDocument, PayslipDetail, Evaluation, CalendarEvent, Holiday } from '../types';

export const employee: Employee = {
  id: 'PERS-00742',
  firstName: 'Mahougnon',
  name: 'Mahougnon Akplogan',
  initials: 'MA',
  position: 'Maître-assistant',
  department: 'Informatique',
  faculty: 'Faculté des Sciences & Techniques',
  contractType: 'CDI',
  contractSince: 'depuis oct. 2019',
  payProfile: 'Enseignant-chercheur',
  matricule: 'PERS-00742',
  cnss: '0123 847 561',
  manager: 'Sylvain Dossou',
  birthDate: '12 mars 1981',
  familyStatus: 'Marié(e)',
  proEmail: 'mahougnon.akplogan@lanem.bj',
  personalEmail: 'm.akplogan@gmail.com',
  phone: '+229 01 97 00 00 00',
  address: 'Lot 248, Abomey-Calavi, Bénin',
  emergencyContact: 'Akplogan A. · +229 01 96 …',
};

export const currentUser: CurrentUser = {
  name: employee.name,
  role: employee.position,
  initials: employee.initials,
};

export const leaveBalances: LeaveBalance[] = [
  { id: 'annuel',     label: 'Congé annuel',              remaining: 18, total: 30, tone: 'ink',     note: '12 jours pris · 10 jours posés à venir' },
  { id: 'maladie',    label: 'Congé maladie',             remaining: 5,  total: 7,  tone: 'success', note: '2 jours pris · justificatif requis' },
  { id: 'permission', label: 'Permission exceptionnelle', remaining: 2,  total: 10, tone: 'accent',  note: '8 jours pris · événements familiaux' },
];

export const leaveRequests: LeaveRequest[] = [
  { id: 'LR-06', type: 'Permission exceptionnelle', period: '3 juil. 2026',        days: 1,  status: 'pending' },
  { id: 'LR-05', type: 'Congé annuel',              period: '20 → 31 juil. 2026',  days: 10, status: 'approved' },
  { id: 'LR-04', type: 'Congé maladie',             period: '14 → 15 avr. 2026',   days: 2,  status: 'approved' },
  { id: 'LR-03', type: 'Congé annuel',              period: '2 → 6 janv. 2026',    days: 5,  status: 'completed' },
  { id: 'LR-02', type: 'Permission exceptionnelle', period: '9 déc. 2025',         days: 1,  status: 'rejected' },
];

export const requests: HrRequest[] = [
  { id: 'REQ-0142', subject: 'Attestation de travail', detail: 'Pour dossier bancaire', category: 'attestation', date: '15 juin 2026', amount: null, status: 'pending' },
  { id: 'REQ-0141', subject: "Attestation d'assiduité", detail: 'Année universitaire 2025–2026', category: 'attestation', date: '14 juin 2026', amount: null, status: 'issued' },
  { id: 'REQ-0140', subject: "Attestation de bonne exécution de mission d'enseignement", detail: 'Cours de Master — semestre 2', category: 'attestation', date: '13 juin 2026', amount: null, status: 'issued' },
  { id: 'REQ-0139', subject: 'Acompte sur salaire', detail: 'Remboursement sur paie de juillet', category: 'advance', date: '12 juin 2026', amount: 150000, status: 'pending' },
  { id: 'REQ-0138', subject: 'Permission exceptionnelle', detail: '3 juillet — événement familial', category: 'leave', date: '10 juin 2026', amount: null, status: 'pending' },
  { id: 'REQ-0137', subject: 'Note de frais — mission Cotonou', detail: 'Transport + hébergement, 2 nuits', category: 'expense', date: '28 mai 2026', amount: 86500, status: 'reimbursed' },
  { id: 'REQ-0136', subject: 'Congé annuel', detail: '20 → 31 juillet', category: 'leave', date: '15 mai 2026', amount: null, status: 'approved' },
  { id: 'REQ-0135', subject: 'Note de frais — colloque UAC', detail: "Frais d'inscription", category: 'expense', date: '3 avr. 2026', amount: 45000, status: 'reimbursed' },
  { id: 'REQ-0134', subject: 'Acompte sur salaire', detail: 'Demande de février', category: 'advance', date: '5 févr. 2026', amount: 100000, status: 'rejected' },
];

export const payslips: Payslip[] = [
  { id: 'PSLIP-2026-05', period: 'Mai 2026',     issuedOn: '31 mai 2026',   gross: 612400, deductions: 119250, incomeTax: 96250,  net: 493150, status: 'available', year: 2026 },
  { id: 'PSLIP-2026-04', period: 'Avril 2026',   issuedOn: '30 avr. 2026',  gross: 612400, deductions: 119250, incomeTax: 96250,  net: 493150, status: 'available', year: 2026 },
  { id: 'PSLIP-2026-03', period: 'Mars 2026',    issuedOn: '31 mars 2026',  gross: 628900, deductions: 123100, incomeTax: 100250, net: 505800, status: 'available', year: 2026 },
  { id: 'PSLIP-2026-02', period: 'Février 2026', issuedOn: '28 févr. 2026', gross: 612400, deductions: 119250, incomeTax: 96250,  net: 493150, status: 'available', year: 2026 },
  { id: 'PSLIP-2026-01', period: 'Janvier 2026', issuedOn: '31 janv. 2026', gross: 595800, deductions: 115300, incomeTax: 92000,  net: 480500, status: 'available', year: 2026 },
  { id: 'PSLIP-2025-12', period: 'Décembre 2025', issuedOn: '31 déc. 2025', gross: 712400, deductions: 142800, incomeTax: 110000, net: 569600, status: 'archived', year: 2025 },
];

export const payslipDetail: PayslipDetail = {
  id: 'PSLIP-2026-05', period: 'Mai 2026', issuedOn: '31 mai 2026', gross: 612400, deductions: 119250, incomeTax: 96204, net: 493150, status: 'available', year: 2026,
  reference: 'PSLIP-2026-05-00742',
  periodLabel: '1ᵉʳ au 31 mai 2026',
  employerCost: 712834,
  earnings: [
    { label: 'Salaire de base mensuel', amount: 485000 },
    { label: 'Indemnité de recherche',   amount: 90000 },
    { label: 'Prime de technicité',      amount: 37400 },
  ],
  deductionLines: [
    { label: 'CNSS — Pension / retraite',      base: '612 400', rate: '3,6 % / 6,4 %', employee: 22046, employer: 39194 },
    { label: 'CNSS — Prestations familiales',  base: '612 400', rate: '9 %',           employee: null,  employer: 55116 },
    { label: 'CNSS — Risque professionnel',    base: '612 400', rate: '1 %',           employee: null,  employer: 6124 },
    { label: 'ITS — Impôt sur traitements & salaires', base: '590 354', rate: 'barème', employee: 96204, employer: null },
    { label: 'Redevance ORTB',                  base: 'forfait', rate: '—',             employee: 1000,  employer: null },
  ],
  totals: { employee: 119250, employer: 100434 },
  journal: [
    { label: 'Salaire brut', value: 612400 },
    { label: 'Base CNSS plafonnée', value: 612400 },
    { label: 'CNSS salarié (3,6 %)', value: 22046 },
    { label: 'CNSS employeur — pension (6,4 %)', value: 39194 },
    { label: 'Prestations familiales employeur (9 %)', value: 55116 },
    { label: 'Risque professionnel employeur (1 %)', value: 6124 },
    { label: 'Base imposable ITS', value: 590354 },
    { label: 'ITS — barème progressif', value: 96204 },
    { label: 'Redevance ORTB', value: 1000 },
    { label: 'Autres retenues', value: 0 },
    { label: 'Net à payer', value: 493150 },
    { label: 'Coût total employeur', value: 712834 },
  ],
};

export const evaluations: Evaluation[] = [
  {
    id: 'EVAL-2025', year: 2025, title: 'Entretien annuel 2025', score: '4,2/5', validatedOn: '18 janvier 2026',
    evaluator: 'Sylvain Dossou', interviewDate: '12 janvier 2026', performance: 'au-dessus des attentes',
    competences: [
      { label: 'Expertise & qualité pédagogique', score: '5/5' },
      { label: 'Production scientifique', score: '4/5' },
      { label: "Esprit d'équipe", score: '4/5' },
      { label: 'Autonomie & organisation', score: '4/5' },
    ],
    managerSummary: 'Très bonne année, contribution remarquée sur la refonte pédagogique. Poursuivre l’effort de publication et développer l’encadrement doctoral.',
    objectives: ['Publier 2 articles à comité de lecture', 'Co-encadrer une thèse'],
    countersignedOn: '18 janvier 2026',
  },
  {
    id: 'EVAL-2024', year: 2024, title: 'Entretien annuel 2024', score: '3,9/5', validatedOn: '22 janvier 2025',
    evaluator: 'Sylvain Dossou', interviewDate: '15 janvier 2025', performance: 'conforme aux attentes',
    competences: [], managerSummary: '', objectives: [], countersignedOn: '22 janvier 2025',
  },
];

export const holidays: Holiday[] = [
  { date: '2026-01-01', name: 'Jour de l’An' },
  { date: '2026-01-10', name: 'Fête du Vodoun' },
  { date: '2026-05-01', name: 'Fête du Travail' },
  { date: '2026-08-01', name: 'Indépendance' },
  { date: '2026-08-15', name: 'Assomption' },
  { date: '2026-11-01', name: 'Toussaint' },
  { date: '2026-12-25', name: 'Noël' },
];

export const calendarEvents: CalendarEvent[] = [
  { start: '2026-07-20', end: '2026-07-31', label: 'Congé annuel', kind: 'leave' },
  { start: '2026-07-03', end: '2026-07-03', label: 'Permission', kind: 'pending' },
  { start: '2026-04-14', end: '2026-04-15', label: 'Congé maladie', kind: 'leave' },
];

export const colleagues: Colleague[] = [
  { initials: 'GF', name: 'Gisèle Fanou',      role: 'Assistante',                 presence: 'leave' },
  { initials: 'PT', name: 'Pascal Tchégnon',   role: 'Technicien de laboratoire',   presence: 'present' },
  { initials: 'NK', name: 'Nadège Kpodo',      role: 'Maître-assistant',           presence: 'mission' },
  { initials: 'IB', name: 'Ismaël Bio Tchané', role: 'Enseignant vacataire',       presence: 'present' },
  { initials: 'AG', name: 'Adrienne Gomez',    role: 'Assistante administrative',  presence: 'remote' },
];

export const notifications: Notification[] = [
  { id: 'N1', icon: 'i-file',  tone: 'pay',  title: 'Bulletin de paie disponible',   detail: 'Votre bulletin 05/2026 est disponible.' },
  { id: 'N2', icon: 'i-check', tone: 'leave', title: 'Congé approuvé',                detail: 'Congé annuel du 20 au 31 juillet.' },
  { id: 'N3', icon: 'i-cal',   tone: 'none', title: 'Prochain congé dans 34 jours',  detail: 'Congé annuel — début lundi 20 juillet.' },
];

export const contract: Contract = {
  reference: 'CTRX-2019-00318',
  payProfile: 'Enseignant-chercheur',
  startDate: '1ᵉʳ octobre 2019',
  trialPeriod: 'Terminée',
  baseSalary: 485000,
  seniority: '6 ans 8 mois',
  history: [
    { kind: 'CDI',         label: 'Maître-assistant',       period: 'depuis 01/10/2019',      status: 'En cours',  statusVariant: 'success' },
    { kind: 'Avenant',     label: 'Augmentation indiciaire', period: '01/01/2024',            status: 'Appliqué',  statusVariant: 'neutral' },
    { kind: 'Avenant',     label: 'Promotion Maître-assistant', period: '01/10/2022',         status: 'Appliqué',  statusVariant: 'neutral' },
    { kind: 'CDD initial', label: 'Assistant',              period: '01/10/2019 → 30/09/2019', status: 'Clôturé',  statusVariant: 'neutral' },
  ],
};

export const documents: HrDocument[] = [
  { id: 'D1', title: 'Contrat de travail (CDI)',  icon: 'i-doc',   accent: true, meta: 'PDF · 320 Ko · Signé le 1ᵉʳ oct. 2019' },
  { id: 'D2', title: 'Certificat de travail',     icon: 'i-badge',               meta: 'PDF · 180 Ko · Émis le 14 mars 2026' },
  { id: 'D3', title: 'Attestation de salaire',    icon: 'i-stamp',               meta: 'PDF · 145 Ko · Émise le 2 juin 2026' },
  { id: 'D4', title: 'Attestation de présence',   icon: 'i-stamp',               meta: 'PDF · 132 Ko · Émise le 2 juin 2026' },
];
