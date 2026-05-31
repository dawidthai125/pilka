import { InventoryReportsList } from "@/features/inventory/components/inventory-reports-list";
import { canManageInventory } from "@/config/permissions";
import { getDashboardContext, getInventoryReports, requireInventoryReadAccess } from "@/lib/auth/session";

export default async function InventoryReportsPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);
  const reports = await getInventoryReports(access.clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Raporty magazynowe</h1>
        <p className="text-sm text-muted-foreground">Generowanie i publikacja raportów</p>
      </div>
      <InventoryReportsList reports={reports} canManage={canManageInventory(access.roles)} />
    </div>
  );
}
