"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createFinanceIncome } from "@/features/finance/actions";
import {
  FINANCE_INCOME_CATEGORY_LABELS,
} from "@/lib/finance/constants";
import { FINANCE_INCOME_CATEGORIES } from "@/types/finance";

export function FinanceIncomeForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createFinanceIncome, {});

  return (
    <form action={action} className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Dodaj przychód</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Data
          <input
            type="date"
            name="transactionDate"
            required
            defaultValue={defaultDate}
            className="border-input bg-background mt-1 min-h-[44px] w-full rounded-md border px-3"
          />
        </label>
        <label className="block text-sm">
          Kwota (PLN)
          <input
            type="number"
            name="amount"
            min="0"
            step="0.01"
            required
            className="border-input bg-background mt-1 min-h-[44px] w-full rounded-md border px-3"
          />
        </label>
      </div>
      <label className="block text-sm">
        Opis
        <input
          name="description"
          required
          className="border-input bg-background mt-1 min-h-[44px] w-full rounded-md border px-3"
        />
      </label>
      <label className="block text-sm">
        Kategoria
        <select name="category" required className="border-input bg-background mt-1 min-h-[44px] w-full rounded-md border px-3">
          {FINANCE_INCOME_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {FINANCE_INCOME_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Zapisywanie…" : "Dodaj przychód"}
      </Button>
    </form>
  );
}
