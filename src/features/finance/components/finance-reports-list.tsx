"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateFinanceReport, publishFinanceReport } from "@/features/finance/actions";
import {
  FINANCE_REPORT_PERIOD_LABELS,
  formatMoney,
} from "@/lib/finance/constants";
import type { FinanceReport } from "@/types/finance";
import { FINANCE_REPORT_PERIODS } from "@/types/finance";

export function FinanceReportsList({
  reports,
  canManage,
}: {
  reports: FinanceReport[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(generateFinanceReport, {});
  const [isPublishing, startPublish] = useTransition();

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Generuj raport</h2>
          <input name="title" placeholder="Tytuł raportu" required className="border-input min-h-[44px] rounded-md border px-3 sm:col-span-2" />
          <select name="periodType" className="border-input min-h-[44px] rounded-md border px-3">
            {FINANCE_REPORT_PERIODS.map((p) => (
              <option key={p} value={p}>{FINANCE_REPORT_PERIOD_LABELS[p]}</option>
            ))}
          </select>
          <input name="periodStart" type="date" required className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="periodEnd" type="date" required className="border-input min-h-[44px] rounded-md border px-3" />
          <Button type="submit" disabled={pending} className="w-fit">Generuj</Button>
          {state.success && state.id ? (
            <Link href={`/finance/reports/${state.id}`} className="text-sm text-primary underline">
              Otwórz nowy raport
            </Link>
          ) : null}
        </form>
      ) : null}

      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/finance/reports/${report.id}`} className="font-medium hover:underline">
                  {report.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {report.periodStart} — {report.periodEnd} · Saldo: {formatMoney(report.content.balance)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={report.status === "published" ? "default" : "secondary"}>
                  {report.status === "published" ? "Opublikowany" : "Szkic"}
                </Badge>
                {canManage && report.status === "draft" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isPublishing}
                    onClick={() => startPublish(async () => { await publishFinanceReport(report.id); })}
                  >
                    Publikuj
                  </Button>
                ) : null}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
