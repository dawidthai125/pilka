"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createFinanceBudget } from "@/features/finance/actions";
import {
  FINANCE_BUDGET_TYPE_LABELS,
  formatMoney,
} from "@/lib/finance/constants";
import type { FinanceBudget } from "@/types/finance";
import { FINANCE_BUDGET_TYPES } from "@/types/finance";

export function FinanceBudgetsList({ budgets, canManage }: { budgets: FinanceBudget[]; canManage: boolean }) {
  const [state, action, pending] = useActionState(createFinanceBudget, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Nowy budżet</h2>
          <input name="name" placeholder="Nazwa" required className="border-input min-h-[44px] rounded-md border px-3 sm:col-span-2" />
          <select name="budgetType" className="border-input min-h-[44px] rounded-md border px-3">
            {FINANCE_BUDGET_TYPES.map((t) => (
              <option key={t} value={t}>{FINANCE_BUDGET_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <input name="season" placeholder="Sezon (np. 2025/2026)" className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="plannedAmount" type="number" step="0.01" placeholder="Plan (PLN)" required className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="periodStart" type="date" required className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="periodEnd" type="date" required className="border-input min-h-[44px] rounded-md border px-3" />
          <Button type="submit" disabled={pending} className="w-fit">Utwórz budżet</Button>
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Wykonanie</th>
              <th className="px-4 py-3">Różnica</th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id} className="border-b last:border-0">
                <td className="px-4 py-3">{b.name}</td>
                <td className="px-4 py-3">{FINANCE_BUDGET_TYPE_LABELS[b.budgetType]}</td>
                <td className="px-4 py-3">{formatMoney(b.plannedAmount)}</td>
                <td className="px-4 py-3">{formatMoney(b.executedAmount)}</td>
                <td className={`px-4 py-3 font-medium ${b.difference >= 0 ? "text-green-600" : "text-destructive"}`}>
                  {formatMoney(b.difference)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
    </div>
  );
}
