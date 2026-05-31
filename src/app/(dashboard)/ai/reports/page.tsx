import { Suspense } from "react";

import { AiReportsCenter } from "@/features/ai/components/ai-reports-center";
import {
  canAccessAiReportCategory,
  canManageAi,
  canManageAiReports,
  canManageSportsAiReports,
} from "@/config/permissions";
import type { AiReportCategory } from "@/types/ai";
import {
  getAiReportCategories,
  getAiReports,
  getDashboardContext,
  requireAiReadAccess,
} from "@/lib/auth/session";

type SearchParams = Promise<{ category?: string; q?: string }>;

async function ReportsSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  const category = params.category as AiReportCategory | undefined;
  const [reports, categories] = await Promise.all([
    getAiReports(undefined, category, params.q),
    getAiReportCategories(),
  ]);

  const filtered = reports.filter((r) => canAccessAiReportCategory(access.roles, r.category));

  return (
    <AiReportsCenter
      reports={filtered}
      categories={categories.filter((c) => canAccessAiReportCategory(access.roles, c.id))}
      canManage={canManageAi(access.roles)}
      canManageReports={canManageAiReports(access.roles) || canManageSportsAiReports(access.roles)}
    />
  );
}

export default function AiReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Ładowanie...</p>}>
      <ReportsSection searchParams={searchParams} />
    </Suspense>
  );
}
