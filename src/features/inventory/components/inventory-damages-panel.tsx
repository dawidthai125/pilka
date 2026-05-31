"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { registerInventoryDamage } from "@/features/inventory/actions";
import { INVENTORY_DAMAGE_STATUS_LABELS } from "@/lib/inventory/constants";
import type { InventoryDamage, InventoryItem } from "@/types/inventory";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventoryDamagesPanel({
  items,
  damages,
  canIssue,
}: {
  items: InventoryItem[];
  damages: InventoryDamage[];
  canIssue: boolean;
}) {
  const [state, action, pending] = useActionState(registerInventoryDamage, {});

  return (
    <div className="space-y-6">
      {canIssue ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Zgłoś uszkodzenie</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="itemId" required className={inputClass}>
              <option value="">Wybierz sprzęt</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <input name="damageDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
            <select name="status" className={inputClass}>
              {Object.entries(INVENTORY_DAMAGE_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <textarea name="description" placeholder="Opis uszkodzenia" required rows={3} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Zgłoś</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <ul className="space-y-3">
        {damages.map((damage) => (
          <li key={damage.id} className="rounded-xl border bg-card p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium">{damage.itemName ?? "—"}</p>
                <p className="mt-1 text-sm text-muted-foreground">{damage.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {damage.damageDate} · Zgłosił: {damage.reportedByName ?? "—"}
                </p>
              </div>
              <Badge variant={damage.status === "repaired" ? "default" : "destructive"}>
                {INVENTORY_DAMAGE_STATUS_LABELS[damage.status]}
              </Badge>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
