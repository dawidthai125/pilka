"use client";

import Link from "next/link";
import { useActionState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { generateInventoryReport, publishInventoryReport } from "@/features/inventory/actions";
import { INVENTORY_REPORT_TYPE_LABELS } from "@/lib/inventory/constants";
import type { InventoryReport } from "@/types/inventory";

const inputClass = "border-input min-h-[44px] rounded-md border px-3";

export function InventoryReportsList({
  reports,
  canManage,
}: {
  reports: InventoryReport[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(generateInventoryReport, {});
  const [isPublishing, startPublish] = useTransition();

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Generuj raport magazynowy</h2>
          <input name="title" placeholder="Tytuł raportu" required className={`${inputClass} sm:col-span-2`} />
          <select name="reportType" required className={inputClass}>
            {Object.entries(INVENTORY_REPORT_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <input name="periodStart" type="date" className={inputClass} />
          <input name="periodEnd" type="date" className={inputClass} />
          <Button type="submit" disabled={pending} className="w-fit">Generuj</Button>
          {state.success && state.id ? (
            <Link href={`/inventory/reports/${state.id}`} className="text-sm text-primary underline">
              Otwórz nowy raport
            </Link>
          ) : null}
          {state.error ? <p className="text-sm text-destructive sm:col-span-2">{state.error}</p> : null}
        </form>
      ) : null}

      <ul className="space-y-3">
        {reports.map((report) => (
          <li key={report.id} className="rounded-xl border p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Link href={`/inventory/reports/${report.id}`} className="font-medium hover:underline">
                  {report.title}
                </Link>
                <p className="text-sm text-muted-foreground">
                  {INVENTORY_REPORT_TYPE_LABELS[report.reportType]}
                  {report.periodStart && report.periodEnd
                    ? ` · ${report.periodStart} — ${report.periodEnd}`
                    : null}
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
                    onClick={() => startPublish(async () => { await publishInventoryReport(report.id); })}
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
