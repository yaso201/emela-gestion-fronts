/* ============================================================
   @emela/shared — Point d'accès unique aux données RH (back-office).
   ------------------------------------------------------------
   Les pages consomment UNIQUEMENT ces fonctions (jamais des
   données en dur). Pour brancher le back `benin_hr` :
     1. compléter ../client/frappe.ts (même interface RhDataSource) ;
     2. remplacer `const source = mockSource` par `frappeSource`.
   ============================================================ */
import type {
  RhDataSource, RhKpi, DirectoryEmployee, Contract, PayrollRun, PayrollSlipRow,
  ValidationItem, Declaration, RhEvaluation, Separation, DocumentTemplate, PayrollParameter,
  ContractType, ContractStatus, PayrollRunStatus, EmployeeStatus, DeclarationStatus,
  RhEvaluationStatus, SeparationKind, SeparationStage,
} from '../types';
import * as mock from './mock';
import { frappeSource } from '../client/frappe';

const mockSource: RhDataSource = {
  getKpis:               async () => mock.kpis,
  getDirectory:          async () => mock.directory,
  getEmployee:           async (id) => mock.directory.find((e) => e.id === id) ?? mock.directory[0],
  getContracts:          async () => mock.contracts,
  getPayrollRuns:        async () => mock.payrollRuns,
  getPayrollSlips:       async (runId) => mock.payrollSlips[runId] ?? [],
  getValidations:        async () => mock.validations,
  getDeclarations:       async () => mock.declarations,
  getEvaluations:        async () => mock.evaluations,
  getSeparations:        async () => mock.separations,
  getDocumentTemplates:  async () => mock.documentTemplates,
  getPayrollParameters:  async () => mock.payrollParameters,
};

// 🔌 Source active = back benin_hr (SSR). Repasser à `mockSource` pour la démo.
void mockSource;
const source: RhDataSource = frappeSource;

export const getKpis = (): Promise<RhKpi[]> => source.getKpis();
export const getDirectory = (): Promise<DirectoryEmployee[]> => source.getDirectory();
export const getEmployee = (id: string): Promise<DirectoryEmployee> => source.getEmployee(id);
export const getContracts = (): Promise<Contract[]> => source.getContracts();
export const getPayrollRuns = (): Promise<PayrollRun[]> => source.getPayrollRuns();
export const getPayrollSlips = (runId: string): Promise<PayrollSlipRow[]> => source.getPayrollSlips(runId);
export const getValidations = (): Promise<ValidationItem[]> => source.getValidations();
export const getDeclarations = (): Promise<Declaration[]> => source.getDeclarations();
export const getEvaluations = (): Promise<RhEvaluation[]> => source.getEvaluations();
export const getSeparations = (): Promise<Separation[]> => source.getSeparations();
export const getDocumentTemplates = (): Promise<DocumentTemplate[]> => source.getDocumentTemplates();
export const getPayrollParameters = (): Promise<PayrollParameter[]> => source.getPayrollParameters();

// ---- Tables de présentation (énum back → variante DS + libellé FR) ----
export const EMPLOYEE_STATUS: Record<EmployeeStatus, { variant: string; label: string }> = {
  Active:    { variant: 'success', label: 'Actif' },
  Inactive:  { variant: 'neutral', label: 'Inactif' },
  Suspended: { variant: 'warning', label: 'Suspendu' },
  Left:      { variant: 'error',   label: 'Parti' },
};

export const CONTRACT_STATUS: Record<ContractStatus, { variant: string; label: string }> = {
  Brouillon: { variant: 'neutral', label: 'Brouillon' },
  Actif:     { variant: 'success', label: 'Actif' },
  Suspendu:  { variant: 'warning', label: 'Suspendu' },
  Resilie:   { variant: 'error',   label: 'Résilié' },
  Expire:    { variant: 'neutral', label: 'Expiré' },
};

export const CONTRACT_TYPE: Record<ContractType, string> = {
  CDI: 'CDI', CDD: 'CDD', 'Temps partiel': 'Temps partiel', Apprentissage: 'Apprentissage', Etranger: 'Étranger',
};

/** Workflow Payroll Run → variante + libellé FR (avec accents pour l'UI). */
export const PAYROLL_STATUS: Record<PayrollRunStatus, { variant: string; label: string }> = {
  Preparation:          { variant: 'neutral', label: 'Préparation' },
  'Validee finance':    { variant: 'info',    label: 'Validée finance' },
  'Validee direction':  { variant: 'accent',  label: 'Validée direction' },
  Generee:              { variant: 'success', label: 'Générée' },
  'Transmise ERPNext':  { variant: 'success', label: 'Transmise ERPNext' },
  Annulee:              { variant: 'error',   label: 'Annulée' },
};

export const DECLARATION_STATUS: Record<DeclarationStatus, { variant: string; label: string }> = {
  a_produire: { variant: 'warning', label: 'À produire' },
  genere:     { variant: 'info',    label: 'Généré' },
  transmis:   { variant: 'success', label: 'Transmis' },
};

export const EVALUATION_STATUS: Record<RhEvaluationStatus, { variant: string; label: string }> = {
  planifiee: { variant: 'neutral', label: 'Planifiée' },
  en_cours:  { variant: 'warning', label: 'En cours' },
  validee:   { variant: 'success', label: 'Validée' },
};

export const SEPARATION_KIND: Record<SeparationKind, string> = {
  demission: 'Démission', fin_contrat: 'Fin de contrat', licenciement: 'Licenciement', retraite: 'Départ à la retraite', rupture: 'Rupture conventionnelle',
};

/** Badge d'état global d'une séparation (calculé à partir de stage + protected). */
export const separationBadge = (s: { stage: SeparationStage; protected: boolean }): { variant: string; label: string } => {
  if (s.protected && s.stage === 'autorisation') return { variant: 'error', label: 'Cas protégé — bloqué' };
  if (s.stage === 'cloturee') return { variant: 'success', label: 'Clôturée' };
  if (s.stage === 'finalisation') return { variant: 'accent', label: 'À finaliser' };
  if (s.stage === 'documents') return { variant: 'info', label: 'Documents générés' };
  if (s.stage === 'solde') return { variant: 'info', label: 'Solde de tout compte' };
  return { variant: 'neutral', label: 'En cours' };
};

/** Les 5 étapes du circuit, avec done/cur dérivés du stage (et du flag protégé). */
export const separationSteps = (s: { stage: SeparationStage; protected: boolean }): { label: string; done: boolean; cur: boolean }[] => {
  const order: SeparationStage[] = ['initiee', s.protected ? 'autorisation' : 'preavis', 'documents', 'solde', 'finalisation'];
  const labels: Record<string, string> = {
    initiee: 'Initiée', autorisation: 'Autorisation requise', preavis: 'Préavis',
    documents: 'Documents', solde: 'Solde de tout compte', finalisation: 'Finalisation',
  };
  const curStage: SeparationStage = s.stage === 'cloturee' ? 'finalisation' : s.stage;
  const curIdx = order.indexOf(curStage);
  const closed = s.stage === 'cloturee';
  return order.map((st, i) => ({
    label: i === order.length - 1 && closed ? 'Finalisée' : labels[st],
    done: closed ? true : i < curIdx,
    cur: !closed && i === curIdx,
  }));
};

const MONTHS_FR = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
/** "05" + "2026" → "Mai 2026". */
export const periodLabel = (month: string, year: string): string => `${MONTHS_FR[parseInt(month, 10)] ?? month} ${year}`;

/** Format monétaire FCFA. */
export const fcfa = (n: number): string => new Intl.NumberFormat('fr-FR').format(Math.round(n)) + ' F';

/** Format compact (M / k) pour les KPIs. */
export const fcfaShort = (n: number): string => {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M F';
  if (n >= 1_000) return Math.round(n / 1_000) + ' k F';
  return n + ' F';
};
