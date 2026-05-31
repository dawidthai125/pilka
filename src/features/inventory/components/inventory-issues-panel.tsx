"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { issueInventoryItem } from "@/features/inventory/actions";
import { INVENTORY_RECIPIENT_TYPE_LABELS } from "@/lib/inventory/constants";
import type { ClubMemberRow } from "@/lib/auth/session";
import type { InventoryItem, InventoryTransaction } from "@/types/inventory";
import type { Player } from "@/types/players";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventoryIssuesPanel({
  items,
  players,
  members,
  transactions,
  canIssue,
}: {
  items: InventoryItem[];
  players: Player[];
  members: ClubMemberRow[];
  transactions: InventoryTransaction[];
  canIssue: boolean;
}) {
  const [state, action, pending] = useActionState(issueInventoryItem, {});

  const availableItems = items.filter((i) => i.quantityAvailable > 0);
  const staffMembers = members.filter((m) =>
    (["coach", "owner", "president", "sports_director"] as string[]).includes(m.role),
  );

  return (
    <div className="space-y-6">
      {canIssue ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Wydaj sprzęt</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="itemId" required className={inputClass}>
              <option value="">Wybierz sprzęt</option>
              {availableItems.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (dostępne: {i.quantityAvailable})
                </option>
              ))}
            </select>
            <select name="recipientType" required className={inputClass}>
              {Object.entries(INVENTORY_RECIPIENT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select name="playerId" className={inputClass}>
              <option value="">Zawodnik (gdy odbiorca: zawodnik)</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            <select name="profileId" className={inputClass}>
              <option value="">Pracownik klubu (gdy trener/kierownik)</option>
              {staffMembers.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.profile?.full_name ?? m.profile?.email ?? m.user_id}
                </option>
              ))}
            </select>
            <input name="quantity" type="number" min={1} placeholder="Ilość" required className={inputClass} />
            <input name="issueDate" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className={inputClass} />
            <input name="expectedReturnDate" type="date" className={inputClass} />
          </div>
          <textarea name="notes" placeholder="Uwagi" rows={2} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Wydaj</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Sprzęt</th>
              <th className="px-4 py-3">Odbiorca</th>
              <th className="px-4 py-3">Ilość</th>
              <th className="px-4 py-3">Data wydania</th>
              <th className="px-4 py-3">Planowany zwrot</th>
              <th className="px-4 py-3">Wydał</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx.id} className="border-b last:border-0">
                <td className="px-4 py-3">{tx.itemName ?? "—"}</td>
                <td className="px-4 py-3">
                  {tx.recipientType === "player"
                    ? tx.playerName ?? "—"
                    : tx.profileName ?? INVENTORY_RECIPIENT_TYPE_LABELS[tx.recipientType]}
                </td>
                <td className="px-4 py-3">{tx.quantity}</td>
                <td className="px-4 py-3">{tx.issueDate}</td>
                <td className="px-4 py-3">{tx.expectedReturnDate ?? "—"}</td>
                <td className="px-4 py-3">{tx.issuedByName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
