"use client";

import { useActionState } from "react";

import { upsertEquipmentKitAction } from "@/features/equipment/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EQUIPMENT_KIT_TYPES,
  EQUIPMENT_KIT_TYPE_LABELS,
  type EquipmentKitRow,
} from "@/types/equipment";

export function EquipmentKitsPanel({
  kits,
  canManage,
  players,
}: {
  kits: EquipmentKitRow[];
  canManage: boolean;
  players: Array<{ id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(upsertEquipmentKitAction, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="max-w-xl space-y-3 rounded-md border p-4">
          <h3 className="font-medium">Przypisz strój</h3>
          <div className="space-y-2">
            <Label htmlFor="playerId">Zawodnik</Label>
            <select
              id="playerId"
              name="playerId"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            >
              <option value="">Wybierz…</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="kitType">Typ</Label>
              <select
                id="kitType"
                name="kitType"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                {EQUIPMENT_KIT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {EQUIPMENT_KIT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jerseyNumber">Numer</Label>
              <Input id="jerseyNumber" name="jerseyNumber" type="number" min={1} max={99} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="size">Rozmiar</Label>
              <Input id="size" name="size" required placeholder="M" />
            </div>
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
          <Button type="submit" disabled={pending}>
            Zapisz strój
          </Button>
        </form>
      ) : null}

      <div className="divide-y rounded-md border">
        {kits.map((k) => (
          <div key={k.id} className="px-4 py-3">
            <p className="font-medium">{k.playerName ?? "Zawodnik"}</p>
            <p className="text-sm text-muted-foreground">
              {EQUIPMENT_KIT_TYPE_LABELS[k.kitType]}
              {k.jerseyNumber != null ? ` · nr ${k.jerseyNumber}` : ""} · rozmiar {k.size}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
