import type {
  FinanceBudgetType,
  FinanceDocumentType,
  FinanceExpenseCategory,
  FinanceFeePlanType,
  FinanceGrantStatus,
  FinanceIncomeCategory,
  FinancePlayerFeeStatus,
  FinanceReportPeriod,
} from "@/types/finance";

export const FINANCE_INCOME_CATEGORY_LABELS: Record<FinanceIncomeCategory, string> = {
  sponsors: "Sponsorzy",
  player_fees: "Składki zawodników",
  grants: "Dotacje",
  donations: "Darowizny",
  club_sales: "Sprzedaż klubowa",
  other: "Inne",
};

export const FINANCE_EXPENSE_CATEGORY_LABELS: Record<FinanceExpenseCategory, string> = {
  equipment: "Sprzęt",
  kits: "Stroje",
  referees: "Sędziowie",
  transport: "Transport",
  pitch: "Boisko",
  training: "Treningi",
  marketing: "Marketing",
  administration: "Administracja",
  other: "Inne",
};

export const FINANCE_FEE_PLAN_TYPE_LABELS: Record<FinanceFeePlanType, string> = {
  monthly: "Miesięczna",
  one_time: "Jednorazowa",
};

export const FINANCE_PLAYER_FEE_STATUS_LABELS: Record<FinancePlayerFeeStatus, string> = {
  paid: "Opłacona",
  partial: "Częściowo opłacona",
  overdue: "Zaległa",
};

export const FINANCE_GRANT_STATUS_LABELS: Record<FinanceGrantStatus, string> = {
  planned: "Planowana",
  active: "Aktywna",
  completed: "Zakończona",
};

export const FINANCE_BUDGET_TYPE_LABELS: Record<FinanceBudgetType, string> = {
  season: "Budżet sezonowy",
  team: "Budżet drużyny",
  event: "Budżet wydarzenia",
};

export const FINANCE_DOCUMENT_TYPE_LABELS: Record<FinanceDocumentType, string> = {
  invoice: "Faktura",
  receipt: "Rachunek",
  contract: "Umowa",
};

export const FINANCE_REPORT_PERIOD_LABELS: Record<FinanceReportPeriod, string> = {
  monthly: "Miesięczny",
  quarterly: "Kwartalny",
  yearly: "Roczny",
};

export const FINANCE_CURRENCY = "PLN";

export function formatMoney(amount: number, currency = FINANCE_CURRENCY): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function feeStatusVariant(
  status: FinancePlayerFeeStatus,
  dueDate: string,
): "default" | "secondary" | "destructive" {
  if (status === "paid") return "default";
  if (status === "partial") return "secondary";
  if (dueDate >= new Date().toISOString().slice(0, 10)) return "secondary";
  return "destructive";
}
