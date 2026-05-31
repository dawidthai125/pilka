import { FinanceReportsList } from "@/features/finance/components/finance-reports-list";
import { canManageFinance } from "@/config/permissions";
import { getDashboardContext, getFinanceReports, requireFinanceReadAccess } from "@/lib/auth/session";

export default async function FinanceReportsPage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const reports = await getFinanceReports(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Raporty finansowe</h1>
      <FinanceReportsList reports={reports} canManage={canManageFinance(access.roles)} />
    </div>
  );
}
