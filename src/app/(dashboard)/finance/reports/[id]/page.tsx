import { notFound } from "next/navigation";

import { FinanceReportView } from "@/features/finance/components/finance-report-view";
import { getDashboardContext, getFinanceReport, requireFinanceReadAccess } from "@/lib/auth/session";

export default async function FinanceReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const report = await getFinanceReport(id, access.clubId);
  if (!report) notFound();

  return (
    <div className="space-y-4">
      <FinanceReportView report={report} />
    </div>
  );
}
