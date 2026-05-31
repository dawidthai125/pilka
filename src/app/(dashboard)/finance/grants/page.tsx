import { FinanceGrantsList } from "@/features/finance/components/finance-grants-list";
import { canManageFinance } from "@/config/permissions";
import { getDashboardContext, getFinanceGrants, requireFinanceReadAccess } from "@/lib/auth/session";

export default async function FinanceGrantsPage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const grants = await getFinanceGrants(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dotacje</h1>
      <FinanceGrantsList grants={grants} canManage={canManageFinance(access.roles)} />
    </div>
  );
}
