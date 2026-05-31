import { FinanceExpenseForm } from "@/features/finance/components/finance-expense-form";
import { FinanceTransactionsTable } from "@/features/finance/components/finance-transactions-table";
import { canManageFinance } from "@/config/permissions";
import { getDashboardContext, getFinanceExpenses, requireFinanceReadAccess } from "@/lib/auth/session";

export default async function FinanceExpensesPage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const expenses = await getFinanceExpenses(access.clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Koszty</h1>
        <p className="text-sm text-muted-foreground">{expenses.length} operacji</p>
      </div>
      {canManageFinance(access.roles) ? <FinanceExpenseForm /> : null}
      <FinanceTransactionsTable type="expense" items={expenses} />
    </div>
  );
}
