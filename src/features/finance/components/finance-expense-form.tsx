"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createFinanceExpense } from "@/features/finance/actions";
import {
  FINANCE_EXPENSE_CATEGORY_LABELS,
} from "@/lib/finance/constants";
import { FINANCE_EXPENSE_CATEGORIES } from "@/types/finance";

export function FinanceExpenseForm({ defaultDate }: { defaultDate: string }) {
  const [state, action, pending] = useActionState(createFinanceExpense, {});

  return (
    <form action={action} encType="multipart/form-data" className="space-y-4 rounded-xl border bg-card p-4">
      <h2 className="font-semibold">Dodaj koszt</h2>
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
          {FINANCE_EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {FINANCE_EXPENSE_CATEGORY_LABELS[cat]}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Załącznik (PDF / zdjęcie)
        <input
          type="file"
          name="attachment"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="mt-1 w-full text-sm"
        />
      </label>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? "Zapisywanie…" : "Dodaj koszt"}
      </Button>
    </form>
  );
}
