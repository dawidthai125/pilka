"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createFinanceGrant } from "@/features/finance/actions";
import {
  FINANCE_GRANT_STATUS_LABELS,
  formatMoney,
} from "@/lib/finance/constants";
import type { FinanceGrant, FinanceGrantStatus } from "@/types/finance";
import { FINANCE_GRANT_STATUSES } from "@/types/finance";

export function FinanceGrantsList({ grants, canManage }: { grants: FinanceGrant[]; canManage: boolean }) {
  const [state, action, pending] = useActionState(createFinanceGrant, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2">
          <h2 className="font-semibold sm:col-span-2">Dodaj dotację</h2>
          <input name="source" placeholder="Źródło" required className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="amount" type="number" step="0.01" placeholder="Kwota" required className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="periodStart" type="date" required className="border-input min-h-[44px] rounded-md border px-3" />
          <input name="periodEnd" type="date" required className="border-input min-h-[44px] rounded-md border px-3" />
          <select name="status" className="border-input min-h-[44px] rounded-md border px-3">
            {FINANCE_GRANT_STATUSES.map((s: FinanceGrantStatus) => (
              <option key={s} value={s}>{FINANCE_GRANT_STATUS_LABELS[s]}</option>
            ))}
          </select>
          <input name="description" placeholder="Opis" className="border-input min-h-[44px] rounded-md border px-3 sm:col-span-2" />
          <Button type="submit" disabled={pending} className="sm:col-span-2 w-fit">Dodaj dotację</Button>
          {state.error ? <p className="text-sm text-destructive sm:col-span-2">{state.error}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Źródło</th>
              <th className="px-4 py-3">Kwota</th>
              <th className="px-4 py-3">Okres</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {grants.map((g) => (
              <tr key={g.id} className="border-b last:border-0">
                <td className="px-4 py-3">{g.source}</td>
                <td className="px-4 py-3">{formatMoney(g.amount)}</td>
                <td className="px-4 py-3">{g.periodStart} — {g.periodEnd}</td>
                <td className="px-4 py-3">
                  <Badge>{FINANCE_GRANT_STATUS_LABELS[g.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
