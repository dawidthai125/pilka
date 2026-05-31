export const FINANCE_INCOME_CATEGORIES = [
  "sponsors",
  "player_fees",
  "grants",
  "donations",
  "club_sales",
  "other",
] as const;

export type FinanceIncomeCategory = (typeof FINANCE_INCOME_CATEGORIES)[number];

export const FINANCE_EXPENSE_CATEGORIES = [
  "equipment",
  "kits",
  "referees",
  "transport",
  "pitch",
  "training",
  "marketing",
  "administration",
  "other",
] as const;

export type FinanceExpenseCategory = (typeof FINANCE_EXPENSE_CATEGORIES)[number];

export const FINANCE_FEE_PLAN_TYPES = ["monthly", "one_time"] as const;
export type FinanceFeePlanType = (typeof FINANCE_FEE_PLAN_TYPES)[number];

export const FINANCE_PLAYER_FEE_STATUSES = ["paid", "partial", "overdue"] as const;
export type FinancePlayerFeeStatus = (typeof FINANCE_PLAYER_FEE_STATUSES)[number];

export const FINANCE_GRANT_STATUSES = ["planned", "active", "completed"] as const;
export type FinanceGrantStatus = (typeof FINANCE_GRANT_STATUSES)[number];

export const FINANCE_BUDGET_TYPES = ["season", "team", "event"] as const;
export type FinanceBudgetType = (typeof FINANCE_BUDGET_TYPES)[number];

export const FINANCE_DOCUMENT_TYPES = ["invoice", "receipt", "contract"] as const;
export type FinanceDocumentType = (typeof FINANCE_DOCUMENT_TYPES)[number];

export const FINANCE_REPORT_PERIODS = ["monthly", "quarterly", "yearly"] as const;
export type FinanceReportPeriod = (typeof FINANCE_REPORT_PERIODS)[number];

export const FINANCE_REPORT_STATUSES = ["draft", "published"] as const;
export type FinanceReportStatus = (typeof FINANCE_REPORT_STATUSES)[number];

export type FinanceIncome = {
  id: string;
  clubId: string;
  transactionDate: string;
  amount: number;
  currency: string;
  description: string;
  category: FinanceIncomeCategory;
  sponsorId: string | null;
  grantId: string | null;
  playerFeeId: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
};

export type FinanceExpense = {
  id: string;
  clubId: string;
  transactionDate: string;
  amount: number;
  currency: string;
  description: string;
  category: FinanceExpenseCategory;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdBy: string | null;
  createdByName?: string | null;
  createdAt: string;
};

export type FinanceFeePlan = {
  id: string;
  clubId: string;
  name: string;
  feeType: FinanceFeePlanType;
  amount: number;
  currency: string;
  teamId: string | null;
  isActive: boolean;
};

export type FinancePlayerFee = {
  id: string;
  clubId: string;
  playerId: string;
  playerName?: string;
  feePlanId: string | null;
  name: string;
  dueDate: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  status: FinancePlayerFeeStatus;
  periodMonth: string | null;
};

export type FinanceFeePayment = {
  id: string;
  clubId: string;
  playerFeeId: string;
  paymentDate: string;
  amount: number;
  note: string | null;
  recordedBy: string | null;
  recordedByName?: string | null;
  createdAt: string;
};

export type FinanceGrant = {
  id: string;
  clubId: string;
  source: string;
  amount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  status: FinanceGrantStatus;
  description: string | null;
};

export type FinanceBudget = {
  id: string;
  clubId: string;
  name: string;
  budgetType: FinanceBudgetType;
  teamId: string | null;
  teamName?: string | null;
  season: string | null;
  periodStart: string;
  periodEnd: string;
  plannedAmount: number;
  executedAmount: number;
  difference: number;
  currency: string;
  notes: string | null;
};

export type FinanceDocument = {
  id: string;
  clubId: string;
  documentType: FinanceDocumentType;
  title: string;
  storagePath: string;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  issueDate: string | null;
  amount: number | null;
  uploadedBy: string | null;
  createdAt: string;
};

export type FinanceReport = {
  id: string;
  clubId: string;
  title: string;
  periodType: FinanceReportPeriod;
  periodStart: string;
  periodEnd: string;
  content: FinanceReportContent;
  status: FinanceReportStatus;
  generatedBy: string | null;
  createdAt: string;
};

export type FinanceReportContent = {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  overdueFeesCount: number;
  incomeByCategory?: Record<string, number>;
  expensesByCategory?: Record<string, number>;
  narrative?: string;
};

export type FinanceDashboardStats = {
  balance: number;
  totalIncome: number;
  totalExpenses: number;
  totalFeesDue: number;
  totalFeesPaid: number;
  overdueFeesCount: number;
  sponsorIncomeTotal: number;
  recentIncome: FinanceIncome[];
  recentExpenses: FinanceExpense[];
  overdueFees: FinancePlayerFee[];
};

export type ParentFinancePortalData = {
  playerName: string;
  playerId: string;
  balance: number;
  fees: FinancePlayerFee[];
  payments: FinanceFeePayment[];
};
