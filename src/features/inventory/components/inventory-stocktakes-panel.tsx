"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createInventoryStocktake } from "@/features/inventory/actions";
import {
  INVENTORY_STOCKTAKE_STATUS_LABELS,
  INVENTORY_STOCKTAKE_TYPE_LABELS,
} from "@/lib/inventory/constants";
import type { InventoryStocktake } from "@/types/inventory";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventoryStocktakesPanel({
  stocktakes,
  canManage,
}: {
  stocktakes: InventoryStocktake[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(createInventoryStocktake, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Nowa inwentaryzacja</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="name" placeholder="Nazwa inwentaryzacji" required className={inputClass} />
            <select name="stocktakeType" required className={inputClass}>
              {Object.entries(INVENTORY_STOCKTAKE_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <textarea name="notes" placeholder="Uwagi" rows={2} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Rozpocznij inwentaryzację</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Typ</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Rozpoczęto</th>
              <th className="px-4 py-3">Pozycje</th>
              <th className="px-4 py-3">Rozbieżności</th>
              <th className="px-4 py-3">Prowadził</th>
            </tr>
          </thead>
          <tbody>
            {stocktakes.map((st) => (
              <tr key={st.id} className="border-b last:border-0">
                <td className="px-4 py-3">{st.name}</td>
                <td className="px-4 py-3">{INVENTORY_STOCKTAKE_TYPE_LABELS[st.stocktakeType]}</td>
                <td className="px-4 py-3">
                  <Badge variant={st.status === "completed" ? "default" : "secondary"}>
                    {INVENTORY_STOCKTAKE_STATUS_LABELS[st.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">{st.startedAt.slice(0, 10)}</td>
                <td className="px-4 py-3">{st.linesCount}</td>
                <td className="px-4 py-3">{st.discrepancyCount}</td>
                <td className="px-4 py-3">{st.conductedByName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
