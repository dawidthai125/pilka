"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { returnInventoryItem } from "@/features/inventory/actions";
import { INVENTORY_RETURN_CONDITION_LABELS } from "@/lib/inventory/constants";
import type { InventoryItem, InventoryReturn, InventoryTransaction } from "@/types/inventory";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventoryReturnsPanel({
  items,
  transactions,
  returns,
  canIssue,
}: {
  items: InventoryItem[];
  transactions: InventoryTransaction[];
  returns: InventoryReturn[];
  canIssue: boolean;
}) {
  const [state, action, pending] = useActionState(returnInventoryItem, {});

  return (
    <div className="space-y-6">
      {canIssue ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Zarejestruj zwrot</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="itemId" required className={inputClass}>
              <option value="">Wybierz sprzęt</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <select name="transactionId" className={inputClass}>
              <option value="">Powiązane wydanie (opcjonalnie)</option>
              {transactions.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.itemName} — {t.playerName ?? t.profileName ?? "—"} ({t.issueDate})
                </option>
              ))}
            </select>
            <input name="quantity" type="number" min={1} placeholder="Ilość" required className={inputClass} />
            <select name="condition" required className={inputClass}>
              {Object.entries(INVENTORY_RETURN_CONDITION_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input name="returnDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
          </div>
          <textarea name="notes" placeholder="Uwagi" rows={2} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Zapisz zwrot</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Sprzęt</th>
              <th className="px-4 py-3">Ilość</th>
              <th className="px-4 py-3">Stan</th>
              <th className="px-4 py-3">Data zwrotu</th>
              <th className="px-4 py-3">Przyjął</th>
            </tr>
          </thead>
          <tbody>
            {returns.map((ret) => (
              <tr key={ret.id} className="border-b last:border-0">
                <td className="px-4 py-3">{ret.itemName ?? "—"}</td>
                <td className="px-4 py-3">{ret.quantity}</td>
                <td className="px-4 py-3">
                  <Badge variant={ret.condition === "functional" ? "default" : "destructive"}>
                    {INVENTORY_RETURN_CONDITION_LABELS[ret.condition]}
                  </Badge>
                </td>
                <td className="px-4 py-3">{ret.returnDate}</td>
                <td className="px-4 py-3">{ret.recordedByName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
