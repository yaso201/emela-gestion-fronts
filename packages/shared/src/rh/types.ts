/* ============================================================
   @emela/shared — Types domaine RH & Paie (back-office SIRH).
   ------------------------------------------------------------
   Alignés sur les doctypes réels de `benin_hr` (noms de champs
   et énumérations identiques, statuts SANS accents comme le back) :
     - Localized Contract     → Contract
     - Payroll Run            → PayrollRun
     - Payroll Slip           → PayrollSlipRow
     - Employee (HRMS)        → DirectoryEmployee
   Aucune donnée ici, uniquement des formes.
   ============================================================ */

// ---- Profils (rôles) du back-office ----
export type RoleId = 'manager' | 'gest_rh' | 'paie' | 'finance' | 'dir' | 'admin';

// ---- Annuaire du personnel (HRMS Employee) ----
/** Statut d'un dossier salarié (HRMS Employee.status). */
export type EmployeeStatus = 'Active' | 'Inactive' | 'Suspended' | 'Left';

export interface DirectoryEmployee {
  /** name HRMS (matricule), ex. "HR-EMP-0042". */
  id: string;
  employeeName: string;
  department: string;
  designation: string;
  status: EmployeeStatus;
  /** Type de contrat actif (raccourci d'affichage). */
  contractType: ContractType | null;
  initials: string;
  companyEmail: string;
}

// ---- Contrat (Localized Contract) ----
export type ContractType = 'CDI' | 'CDD' | 'Temps partiel' | 'Apprentissage' | 'Etranger';
/** Localized Contract.status — valeurs exactes du back. */
export type ContractStatus = 'Brouillon' | 'Actif' | 'Suspendu' | 'Resilie' | 'Expire';

export interface Contract {
  /** name, ex. "CTRX-2026-00031". */
  id: string;
  employee: string;
  employeeName: string;
  contractType: ContractType;
  startDate: string;
  endDate: string | null;
  probationEndDate: string | null;
  payrollProfile: string | null;
  baseSalary: number;
  status: ContractStatus;
}

// ---- Cycle de paie (Payroll Run) ----
/** Payroll Run.status — workflow exact du back (sans accents). */
export type PayrollRunStatus =
  | 'Preparation'
  | 'Validee finance'
  | 'Validee direction'
  | 'Generee'
  | 'Transmise ERPNext'
  | 'Annulee';

export interface PayrollRun {
  /** name, ex. "PAY-2026-05-00001". */
  id: string;
  /** "01".."12" */
  periodMonth: string;
  periodYear: string;
  status: PayrollRunStatus;
  totalGross: number;
  totalNet: number;
  totalEmployerCost: number;
  slipCount: number;
  erpTransmissionDate: string | null;
}

/** Ligne de bulletin (Payroll Slip) dans une campagne. */
export interface PayrollSlipRow {
  id: string;
  employee: string;
  employeeName: string;
  grossSalary: number;
  cnssEmployee: number;
  cnssEmployer: number;
  pfEmployer: number;
  rpEmployer: number;
  taxableBase: number;
  itsAmount: number;
  otherDeductions: number;
  netSalary: number;
  employerTotalCost: number;
}

// ---- Validations (workflow de paie) ----
export type ValidationStage = 'finance' | 'direction';
export interface ValidationItem {
  /** payroll run concerné */
  runId: string;
  period: string;
  stage: ValidationStage;
  totalNet: number;
  totalEmployerCost: number;
  slipCount: number;
  submittedOn: string;
  submittedBy: string;
}

// ---- Déclarations réglementaires ----
export type DeclarationKind = 'cnss' | 'its';
export type DeclarationStatus = 'a_produire' | 'genere' | 'transmis';
export interface Declaration {
  id: string;
  kind: DeclarationKind;
  /** "T1".."T4" pour CNSS, "01".."12" pour ITS */
  period: string;
  year: string;
  label: string;
  base: number;
  amount: number;
  status: DeclarationStatus;
  legalRef: string;
}

// ---- Évaluations annuelles (vue RH) ----
export type RhEvaluationStatus = 'planifiee' | 'en_cours' | 'validee';
export interface RhEvaluation {
  id: string;
  employee: string;
  employeeName: string;
  department: string;
  campaign: string;
  score: string | null;
  status: RhEvaluationStatus;
  dueDate: string;
}

// ---- Séparations (processus P7) ----
export type SeparationKind = 'demission' | 'fin_contrat' | 'licenciement' | 'retraite' | 'rupture';
/** Étape courante dans le circuit de séparation. */
export type SeparationStage =
  | 'initiee'
  | 'autorisation'   // cas protégé : autorisation inspection du travail requise
  | 'preavis'
  | 'documents'
  | 'solde'          // solde de tout compte
  | 'finalisation'
  | 'cloturee';
export interface Separation {
  id: string;
  employee: string;
  employeeName: string;
  matricule: string;
  designation: string;
  kind: SeparationKind;
  /** Cas protégé (représentant du personnel, maternité…) — contrôle bloquant. */
  protected: boolean;
  protectionReason?: string;
  stage: SeparationStage;
  effectiveDate: string;
  noticeDays: number;
  severance: number | null;
}

// ---- Modèles de documents ----
export interface DocumentTemplate {
  id: string;
  title: string;
  category: string;
  icon: string;
  updatedOn: string;
  /** nb de variables fusionnées dans le modèle */
  variables: number;
}

// ---- Paramètres de paie (Payroll Parameter) ----
export interface PayrollParameter {
  key: string;
  label: string;
  value: string;
  unit: string | null;
  group: string;
}

// ---- Cockpit (KPIs back-office) ----
export interface RhKpi {
  id: string;
  label: string;
  value: string;
  trend?: string;
  trendUp?: boolean;
  roles: RoleId[];
}

/** Contrat d'accès aux données RH — implémenté par la source mock ou Frappe. */
export interface RhDataSource {
  getKpis(): Promise<RhKpi[]>;
  getDirectory(): Promise<DirectoryEmployee[]>;
  getEmployee(id: string): Promise<DirectoryEmployee>;
  getContracts(): Promise<Contract[]>;
  getPayrollRuns(): Promise<PayrollRun[]>;
  getPayrollSlips(runId: string): Promise<PayrollSlipRow[]>;
  getValidations(): Promise<ValidationItem[]>;
  getDeclarations(): Promise<Declaration[]>;
  getEvaluations(): Promise<RhEvaluation[]>;
  getSeparations(): Promise<Separation[]>;
  getDocumentTemplates(): Promise<DocumentTemplate[]>;
  getPayrollParameters(): Promise<PayrollParameter[]>;
}
