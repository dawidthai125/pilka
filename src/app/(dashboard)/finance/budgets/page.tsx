import { FinanceBudgetsList } from "@/features/finance/components/finance-budgets-list";
import { canManageFinance } from "@/config/permissions";
import { getDashboardContext, getFinanceBudgets, requireFinanceReadAccess } from "@/lib/auth/session";

export default async function FinanceBudgetsPage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const budgets = await getFinanceBudgets(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Budżety klubu</h1>
      <FinanceBudgetsList budgets={budgets} canManage={canManageFinance(access.roles)} />
    </div>
  );
}
