"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useActionState } from "react";

import {
  generateAiManagementReport,
  generateAiTrainingReport,
  type AiActionState,
} from "@/features/ai/actions";
import {
  AI_REPORT_CATEGORY_LABELS,
  AI_REPORT_STATUS_LABELS,
  AI_REPORT_TYPE_LABELS,
} from "@/lib/ai/constants";
import type { AiReport, AiReportCategoryRow } from "@/types/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialState: AiActionState = {};
const selectClassName = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function AiReportsCenter({
  reports,
  categories,
  canManage,
  canManageReports,
}: {
  reports: AiReport[];
  categories: AiReportCategoryRow[];
  canManage: boolean;
  canManageReports: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") ?? "";
  const search = searchParams.get("q") ?? "";

  const [trainingState, trainingAction, trainingPending] = useActionState(
    generateAiTrainingReport,
    initialState,
  );
  const [mgmtState, mgmtAction, mgmtPending] = useActionState(
    generateAiManagementReport,
    initialState,
  );

  function pushFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/ai/reports?${params.toString()}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Raporty AI</h1>
        <p className="text-sm text-muted-foreground">Centrum raportów — mecze, treningi, zarząd, social media.</p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row">
        <select
          value={category}
          onChange={(e) => pushFilter("category", e.target.value)}
          className={cn(selectClassName, "lg:max-w-xs")}
        >
          <option value="">Wszystkie kategorie</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <Input
          defaultValue={search}
          placeholder="Szukaj raportów..."
          onChange={(e) => pushFilter("q", e.target.value)}
          className="lg:max-w-sm"
        />
      </div>

      {canManageReports ? (
        <div className="flex flex-wrap gap-2">
          <form action={trainingAction}>
            <Button type="submit" size="sm" variant="outline" disabled={trainingPending}>
              Raport treningowy (tydzień)
            </Button>
          </form>
          {canManage ? (
            <form action={mgmtAction}>
              <Button type="submit" size="sm" variant="outline" disabled={mgmtPending}>
                Raport zarządu (miesiąc)
              </Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {(trainingState.error || mgmtState.error) ? (
        <p className="text-sm text-destructive">{trainingState.error ?? mgmtState.error}</p>
      ) : null}
      {(trainingState.success || mgmtState.success) ? (
        <p className="text-sm text-primary">{trainingState.success ?? mgmtState.success}</p>
      ) : null}

      <div className="space-y-2">
        {reports.length === 0 ? (
          <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Brak raportów.</p>
        ) : (
          reports.map((report) => (
            <Link
              key={report.id}
              href={`/ai/reports/${report.id}`}
              className="flex flex-col gap-2 rounded-xl border p-4 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{report.title}</p>
                <p className="text-sm text-muted-foreground">
                  {AI_REPORT_CATEGORY_LABELS[report.category]} · {AI_REPORT_TYPE_LABELS[report.reportType]}
                </p>
              </div>
              <Badge variant={report.status === "published" ? "default" : "secondary"}>
                {AI_REPORT_STATUS_LABELS[report.status]}
              </Badge>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
