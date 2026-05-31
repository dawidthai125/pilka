"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { upsertInventoryPlayerKit } from "@/features/inventory/actions";
import type { InventoryPlayerKit } from "@/types/inventory";
import type { Player } from "@/types/players";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventoryKitsPanel({
  kits,
  players,
  canManage,
}: {
  kits: InventoryPlayerKit[];
  players: Player[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(upsertInventoryPlayerKit, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Dane stroju zawodnika</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="playerId" required className={inputClass}>
              <option value="">Wybierz zawodnika</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            <input name="jerseyNumber" type="number" min={0} placeholder="Numer na koszulce" className={inputClass} />
            <input name="jerseySize" placeholder="Rozmiar koszulki" className={inputClass} />
            <input name="shortsSize" placeholder="Rozmiar spodenek" className={inputClass} />
            <input name="tracksuitSize" placeholder="Rozmiar dresu" className={inputClass} />
          </div>
          <textarea name="notes" placeholder="Uwagi" rows={2} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Zapisz dane stroju</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Zawodnik</th>
              <th className="px-4 py-3">Nr</th>
              <th className="px-4 py-3">Koszulka</th>
              <th className="px-4 py-3">Spodenki</th>
              <th className="px-4 py-3">Dres</th>
              <th className="px-4 py-3">Uwagi</th>
            </tr>
          </thead>
          <tbody>
            {kits.map((kit) => (
              <tr key={kit.id} className="border-b last:border-0">
                <td className="px-4 py-3">{kit.playerName ?? "—"}</td>
                <td className="px-4 py-3">{kit.jerseyNumber ?? "—"}</td>
                <td className="px-4 py-3">{kit.jerseySize ?? "—"}</td>
                <td className="px-4 py-3">{kit.shortsSize ?? "—"}</td>
                <td className="px-4 py-3">{kit.tracksuitSize ?? "—"}</td>
                <td className="px-4 py-3">{kit.notes ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
