"use client";

import { Button } from "@/components/ui/button";
import { INVENTORY_REPORT_TYPE_LABELS } from "@/lib/inventory/constants";
import type { InventoryReport } from "@/types/inventory";

export function InventoryReportView({ report }: { report: InventoryReport }) {
  const { content } = report;

  const statItems = [
    { label: "Pozycje magazynowe", value: content.totalItems },
    { label: "Niski stan", value: content.lowStockCount },
    { label: "Uszkodzone szt.", value: content.damagedCount },
    { label: "Wydane szt.", value: content.issuedCount },
    { label: "Liczba wydań", value: content.issuesCount },
    { label: "Wydane piłki", value: content.ballsIssued },
    { label: "Wydania strojów", value: content.kitsIssued },
    { label: "Zgłoszone uszkodzenia", value: content.damagesCount },
    { label: "Do wymiany", value: content.replacementNeeded },
  ].filter((item) => item.value != null);

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>Drukuj / PDF</Button>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 rounded-xl border bg-card p-6 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0 print:text-black">
        <header className="border-b pb-4 text-center print:pb-3">
          <h1 className="text-2xl font-bold">{report.title}</h1>
          <p className="text-sm text-muted-foreground print:text-gray-600">
            {INVENTORY_REPORT_TYPE_LABELS[report.reportType]}
            {report.periodStart && report.periodEnd
              ? ` · Okres: ${report.periodStart} — ${report.periodEnd}`
              : null}
          </p>
          {report.generatedByName ? (
            <p className="mt-1 text-xs text-muted-foreground print:text-gray-600">
              Wygenerował: {report.generatedByName} · {report.createdAt.slice(0, 10)}
            </p>
          ) : null}
        </header>

        {statItems.length ? (
          <section className="break-inside-avoid">
            <h2 className="mb-2 font-semibold">Statystyki</h2>
            <div className="grid gap-3 sm:grid-cols-3 print:gap-2">
            {statItems.map((item) => (
              <div key={item.label} className="rounded-lg border p-4 text-center">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-xl font-semibold">{item.value}</p>
              </div>
            ))}
            </div>
          </section>
        ) : null}

        {content.narrative ? (
          <section className="break-inside-avoid">
            <h2 className="mb-2 font-semibold">Podsumowanie</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{content.narrative}</p>
          </section>
        ) : null}

        <p className="text-center text-xs text-muted-foreground print:text-gray-600 print:hidden">
          Raport magazynowy klubu — do pobrania w PDF użyj przycisku Drukuj.
        </p>
      </article>
    </div>
  );
}
