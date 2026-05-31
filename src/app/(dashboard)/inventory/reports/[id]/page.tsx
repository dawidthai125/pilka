import { notFound } from "next/navigation";

import { InventoryReportView } from "@/features/inventory/components/inventory-report-view";
import { getDashboardContext, getInventoryReport, requireInventoryReadAccess } from "@/lib/auth/session";

export default async function InventoryReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);
  const report = await getInventoryReport(id, access.clubId);
  if (!report) notFound();

  return (
    <div className="space-y-4">
      <InventoryReportView report={report} />
    </div>
  );
}
