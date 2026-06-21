/* ============================================================
   @emela/shared — Types domaine de l'espace personnel (SIRH).
   Source unique des contrats de données partagés entre le front
   et le back `benin_hr`. Aucune donnée ici, uniquement des formes.
   ============================================================ */

/** Utilisateur connecté (identité de session — pour le châssis). */
export interface CurrentUser {
  name: string;
  role: string;
  /** Initiales pour l'avatar. */
  initials: string;
}

/** Dossier salarié complet (profil + bandeau d'identité). */
export interface Employee {
  id: string;
  firstName: string;
  name: string;
  initials: string;
  position: string;
  department: string;
  faculty: string;
  contractType: string;
  contractSince: string;
  payProfile: string;
  matricule: string;
  cnss: string;
  manager: string;
  birthDate: string;
  familyStatus: string;
  proEmail: string;
  personalEmail: string;
  phone: string;
  address: string;
  emergencyContact: string;
}

/** Solde d'un compteur de congé. */
export interface LeaveBalance {
  id: string;
  label: string;
  remaining: number;
  total: number;
  /** Couleur de l'anneau / barre (jeton du DS). */
  tone: 'ink' | 'success' | 'accent';
  /** Détail prêt à afficher (ex. « 12 jours pris · … »). */
  note?: string;
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'completed' | 'rejected';

/** Une demande de congé (vue détaillée de la page Congés). */
export interface LeaveRequest {
  id: string;
  type: string;
  period: string;
  days: number;
  status: LeaveRequestStatus;
}

export type RequestCategory = 'leave' | 'advance' | 'expense' | 'attestation';

export type RequestStatus =
  | 'pending'     // En attente
  | 'approved'    // Approuvée
  | 'rejected'    // Refusée
  | 'reimbursed'  // Remboursée
  | 'issued';     // Délivrée (attestation)

/** Une demande générique (congé, acompte, note de frais, attestation). */
export interface HrRequest {
  id: string;
  subject: string;
  detail?: string;
  category: RequestCategory;
  /** Libellé de date prêt à afficher (le back fournit déjà le format FR). */
  date: string;
  /** Montant en FCFA, ou null si sans objet. */
  amount?: number | null;
  status: RequestStatus;
}

/** Présence d'un collègue. */
export type Presence = 'present' | 'leave' | 'mission' | 'remote';

/** Un collègue de l'équipe. */
export interface Colleague {
  initials: string;
  name: string;
  role: string;
  presence: Presence;
}

/** Une notification du tableau de bord. */
export interface Notification {
  id: string;
  /** id d'icône, ex. "i-file". */
  icon: string;
  /** pastille de fond : pay | leave | none. */
  tone: 'pay' | 'leave' | 'none';
  title: string;
  detail: string;
}

/** Un bulletin de paie. */
export interface Payslip {
  id: string;
  period: string;
  /** Date d'émission, prête à afficher. */
  issuedOn: string;
  gross: number;
  deductions: number;
  /** Impôt sur traitements & salaires (sous-ensemble des retenues). */
  incomeTax: number;
  net: number;
  status: 'available' | 'archived';
  /** Année de rattachement (pour les cumuls). */
  year: number;
}

/** Une ligne de bulletin (gain ou retenue). */
export interface PayslipLine {
  label: string;
  base?: string;
  rate?: string;
  amount?: number;
  employee?: number | null;
  employer?: number | null;
}

/** Bulletin de paie détaillé (page de consultation). */
export interface PayslipDetail extends Payslip {
  reference: string;
  periodLabel: string;
  employerCost: number;
  earnings: PayslipLine[];
  /** Lignes de retenue détaillées (distinct du total `deductions: number` hérité de Payslip). */
  deductionLines: PayslipLine[];
  totals: { employee: number; employer: number };
  journal: { label: string; value: number }[];
}

/** Une ligne d'historique de contrat. */
export interface ContractItem {
  kind: string;
  label?: string;
  period: string;
  status: string;
  statusVariant: string;
}

/** Le contrat de travail en cours + historique. */
export interface Contract {
  reference: string;
  payProfile: string;
  startDate: string;
  trialPeriod: string;
  baseSalary: number;
  seniority: string;
  history: ContractItem[];
}

/** Un document RH téléchargeable. */
export interface HrDocument {
  id: string;
  title: string;
  icon: string;
  accent?: boolean;
  meta: string;
}

/** Une évaluation annuelle. */
export interface Evaluation {
  id: string;
  year: number;
  title: string;
  score: string;
  validatedOn: string;
  evaluator: string;
  interviewDate: string;
  performance: string;
  competences: { label: string; score: string }[];
  managerSummary: string;
  objectives: string[];
  countersignedOn: string;
}

/** Un événement du calendrier (congé / absence). */
export interface CalendarEvent {
  start: string;
  end: string;
  label: string;
  kind: 'leave' | 'pending' | 'hol';
}

/** Un jour férié. */
export interface Holiday {
  date: string;
  name: string;
}

/** Contrat d'accès aux données — implémenté par la source mock ou Frappe. */
export interface DataSource {
  getCurrentUser(): Promise<CurrentUser>;
  getEmployee(): Promise<Employee>;
  getLeaveBalances(): Promise<LeaveBalance[]>;
  getLeaveRequests(): Promise<LeaveRequest[]>;
  getRequests(): Promise<HrRequest[]>;
  getPayslips(): Promise<Payslip[]>;
  getPayslipDetail(id: string): Promise<PayslipDetail>;
  getColleagues(): Promise<Colleague[]>;
  getNotifications(): Promise<Notification[]>;
  getContract(): Promise<Contract>;
  getDocuments(): Promise<HrDocument[]>;
  getEvaluations(): Promise<Evaluation[]>;
  getCalendarEvents(): Promise<CalendarEvent[]>;
  getHolidays(): Promise<Holiday[]>;
}
