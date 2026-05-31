"use client";

import { Button } from "@/components/ui/button";
import {
  FINANCE_EXPENSE_CATEGORY_LABELS,
  FINANCE_INCOME_CATEGORY_LABELS,
  formatMoney,
} from "@/lib/finance/constants";
import type { FinanceReport } from "@/types/finance";

export function FinanceReportView({ report }: { report: FinanceReport }) {
  const { content } = report;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>Drukuj / PDF</Button>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 rounded-xl border bg-card p-6 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0">
        <header className="border-b pb-4 text-center print:pb-3">
          <h1 className="text-2xl font-semibold">{report.title}</h1>
          <p className="text-sm text-muted-foreground">
            Okres: {report.periodStart} — {report.periodEnd}
          </p>
        </header>

        <section className="grid gap-3 sm:grid-cols-3 break-inside-avoid">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">Przychody</p>
            <p className="text-xl font-semibold">{formatMoney(content.totalIncome)}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">Koszty</p>
            <p className="text-xl font-semibold">{formatMoney(content.totalExpenses)}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-xs text-muted-foreground">Saldo</p>
            <p className="text-xl font-semibold">{formatMoney(content.balance)}</p>
          </div>
        </section>

        <section className="break-inside-avoid">
          <h2 className="mb-2 font-semibold">Zaległe składki</h2>
          <p>{content.overdueFeesCount} pozycji zaległych / częściowo opłaconych</p>
        </section>

        {content.incomeByCategory ? (
          <section className="break-inside-avoid">
            <h2 className="mb-2 font-semibold">Przychody wg kategorii</h2>
            <ul className="space-y-1 text-sm">
              {Object.entries(content.incomeByCategory).map(([key, value]) => (
                <li key={key} className="flex justify-between gap-4">
                  <span>{FINANCE_INCOME_CATEGORY_LABELS[key as keyof typeof FINANCE_INCOME_CATEGORY_LABELS] ?? key}</span>
                  <span>{formatMoney(value)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.expensesByCategory ? (
          <section className="break-inside-avoid">
            <h2 className="mb-2 font-semibold">Koszty wg kategorii</h2>
            <ul className="space-y-1 text-sm">
              {Object.entries(content.expensesByCategory).map(([key, value]) => (
                <li key={key} className="flex justify-between gap-4">
                  <span>{FINANCE_EXPENSE_CATEGORY_LABELS[key as keyof typeof FINANCE_EXPENSE_CATEGORY_LABELS] ?? key}</span>
                  <span>{formatMoney(value)}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {content.narrative ? (
          <section className="break-inside-avoid">
            <h2 className="mb-2 font-semibold">Podsumowanie</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{content.narrative}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
