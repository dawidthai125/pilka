import { notFound, redirect } from "next/navigation";

import { AiReportEditor } from "@/features/ai/components/ai-report-editor";
import { canAccessAiReportCategory, canPublishAiReports } from "@/config/permissions";
import { getAiReport, getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";

export default async function AiReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  const report = await getAiReport(id);
  if (!report) notFound();
  if (!canAccessAiReportCategory(access.roles, report.category)) {
    redirect("/ai/reports");
  }

  return (
    <AiReportEditor
      report={report}
      canPublish={canPublishAiReports(access.roles)}
    />
  );
}
