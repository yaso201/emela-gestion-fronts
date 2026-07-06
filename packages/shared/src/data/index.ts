/* ============================================================
   @emela/shared — Point d'accès unique aux données du front.
   ------------------------------------------------------------
   Les pages consomment UNIQUEMENT ces fonctions (jamais des
   données en dur). Pour brancher le back `benin_hr` :
     1. compléter ../client/frappe.ts (même interface DataSource) ;
     2. remplacer la ligne `const source = mockSource` par
        `const source = frappeSource`.
   Tout le front bascule sans toucher aux pages.
   ============================================================ */
import type {
  DataSource, CurrentUser, Employee, LeaveBalance, LeaveRequest, HrRequest, Payslip,
  RequestStatus, RequestCategory, LeaveRequestStatus, Colleague, Notification, Presence, Contract, HrDocument, PayslipDetail, Evaluation, CalendarEvent, Holiday,
} from '../types';
import * as mock from './mock';
import { frappeSource } from '../client/frappe';

// ---- Source mock (démo) ----
const mockSource: DataSource = {
  getCurrentUser:   async () => mock.currentUser,
  getEmployee:      async () => mock.employee,
  getLeaveBalances: async () => mock.leaveBalances,
  getLeaveRequests: async () => mock.leaveRequests,
  getRequests:      async () => mock.requests,
  getPayslips:      async () => mock.payslips,
  getPayslipDetail: async (_id: string) => mock.payslipDetail,
  getColleagues:    async () => mock.colleagues,
  getNotifications: async () => mock.notifications,
  getContract:      async () => mock.contract,
  getDocuments:     async () => mock.documents,
  getEvaluations:   async () => mock.evaluations,
  getCalendarEvents: async () => mock.calendarEvents,
  getHolidays:      async () => mock.holidays,
};

// 🔌 Source active = back benin_hr (SSR). Repasser à `mockSource` pour la démo.
void mockSource;
const source: DataSource = frappeSource;

export const getCurrentUser = (): Promise<CurrentUser> => source.getCurrentUser();
export const getEmployee = (): Promise<Employee> => source.getEmployee();
export const getLeaveBalances = (): Promise<LeaveBalance[]> => source.getLeaveBalances();
export const getLeaveRequests = (): Promise<LeaveRequest[]> => source.getLeaveRequests();
export const getRequests = (): Promise<HrRequest[]> => source.getRequests();
export const getPayslips = (): Promise<Payslip[]> => source.getPayslips();
export const getPayslipDetail = (id: string): Promise<PayslipDetail> => source.getPayslipDetail(id);
export const getColleagues = (): Promise<Colleague[]> => source.getColleagues();
export const getNotifications = (): Promise<Notification[]> => source.getNotifications();
export const getContract = (): Promise<Contract> => source.getContract();
export const getDocuments = (): Promise<HrDocument[]> => source.getDocuments();
export const getEvaluations = (): Promise<Evaluation[]> => source.getEvaluations();
export const getCalendarEvents = (): Promise<CalendarEvent[]> => source.getCalendarEvents();
export const getHolidays = (): Promise<Holiday[]> => source.getHolidays();

// ---- Écritures (write-path, POST + CSRF) — séparées de l'interface DataSource ----
export {
  createAcompte, createNoteDeFrais, createHeuresSup, createLeaveRequest, createAttestation,
  getMyAttestations, getMyLetters,
} from '../client/frappe';
export type { CreatedRequest, MyAttestation, MyLetter } from '../client/frappe';

// ---- Tables de présentation (statut/catégorie → variante DS + libellé) ----
export const REQUEST_STATUS: Record<RequestStatus, { variant: string; label: string }> = {
  pending:    { variant: 'warning', label: 'En attente' },
  approved:   { variant: 'success', label: 'Approuvée' },
  rejected:   { variant: 'error',   label: 'Refusée' },
  reimbursed: { variant: 'success', label: 'Remboursée' },
  issued:     { variant: 'success', label: 'Délivrée' },
};

export const REQUEST_CATEGORY: Record<RequestCategory, { variant: string; label: string; icon?: string }> = {
  leave:       { variant: 'info',    label: 'Congé' },
  advance:     { variant: 'accent',  label: 'Acompte' },
  expense:     { variant: 'neutral', label: 'Frais' },
  attestation: { variant: 'info',    label: 'Attestation', icon: 'i-stamp' },
};

/** Icône de liste par catégorie (contexte hors badge). */
export const CATEGORY_ICON: Record<RequestCategory, string> = {
  leave: 'i-plane', advance: 'i-list', expense: 'i-receipt', attestation: 'i-stamp',
};

export const LEAVE_STATUS: Record<LeaveRequestStatus, { variant: string; label: string }> = {
  pending:   { variant: 'warning', label: 'En attente' },
  approved:  { variant: 'success', label: 'Approuvé' },
  completed: { variant: 'neutral', label: 'Terminé' },
  rejected:  { variant: 'error',   label: 'Refusé' },
};

/** Couleur (barre/anneau) + variante de badge selon la tonalité d'un solde. */
export const LEAVE_TONE: Record<'ink' | 'success' | 'accent', { color: string; badge: string }> = {
  ink:     { color: 'var(--ink-700)',     badge: 'info' },
  success: { color: 'var(--success-500)', badge: 'success' },
  accent:  { color: 'var(--accent-500)',  badge: 'accent' },
};

/** Présence d'un collègue → variante de badge + libellé. */
export const PRESENCE: Record<Presence, { variant: string; label: string }> = {
  present: { variant: 'success', label: 'Présent' },
  leave:   { variant: 'accent',  label: 'En congé' },
  mission: { variant: 'neutral', label: 'En mission' },
  remote:  { variant: 'info',    label: 'Télétravail' },
};

/** Format monétaire FCFA. */
export const fcfa = (n: number): string =>
  new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';

/** Pourcentage entier d'un solde restant. */
export const pct = (remaining: number, total: number): number =>
  total > 0 ? Math.round((remaining / total) * 100) : 0;
