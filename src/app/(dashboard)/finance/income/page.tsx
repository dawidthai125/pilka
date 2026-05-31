import { FinanceIncomeForm } from "@/features/finance/components/finance-income-form";
import { FinanceTransactionsTable } from "@/features/finance/components/finance-transactions-table";
import { canManageFinance } from "@/config/permissions";
import { getDashboardContext, getFinanceIncome, requireFinanceReadAccess } from "@/lib/auth/session";

export default async function FinanceIncomePage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const income = await getFinanceIncome(access.clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Przychody</h1>
        <p className="text-sm text-muted-foreground">{income.length} operacji</p>
      </div>
      {canManageFinance(access.roles) ? <FinanceIncomeForm /> : null}
      <FinanceTransactionsTable type="income" items={income} />
    </div>
  );
}
