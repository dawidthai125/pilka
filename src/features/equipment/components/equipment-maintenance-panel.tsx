"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import {
  reportMaintenanceAction,
  updateMaintenanceStatusAction,
} from "@/features/equipment/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ASSET_MAINTENANCE_STATUS_LABELS,
  ASSET_MAINTENANCE_TYPES,
  ASSET_MAINTENANCE_TYPE_LABELS,
  type AssetMaintenanceRow,
  type AssetRow,
} from "@/types/equipment";

export function EquipmentMaintenancePanel({
  maintenance,
  assets,
  canIssue,
  canManage,
}: {
  maintenance: AssetMaintenanceRow[];
  assets: AssetRow[];
  canIssue: boolean;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(reportMaintenanceAction, {});
  const router = useRouter();

  return (
    <div className="space-y-6">
      {canIssue ? (
        <form action={action} className="max-w-xl space-y-3 rounded-md border p-4">
          <h3 className="font-medium">Zgłoś konserwację / uszkodzenie</h3>
          <div className="space-y-2">
            <Label htmlFor="assetId">Sprzęt</Label>
            <select
              id="assetId"
              name="assetId"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            >
              <option value="">Wybierz…</option>
              {assets.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenanceType">Typ</Label>
              <select
                id="maintenanceType"
                name="maintenanceType"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                {ASSET_MAINTENANCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {ASSET_MAINTENANCE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="scheduledAt">Planowany termin</Label>
              <Input id="scheduledAt" name="scheduledAt" type="date" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Tytuł</Label>
            <Input id="title" name="title" required placeholder="np. Wymiana piłek" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Opis</Label>
            <Input id="description" name="description" />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
          <Button type="submit" disabled={pending}>
            Zgłoś
          </Button>
        </form>
      ) : null}

      <div className="divide-y rounded-md border">
        {maintenance.map((m) => (
          <div key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <p className="font-medium">{m.title}</p>
              <p className="text-xs text-muted-foreground">
                {m.assetName} · {ASSET_MAINTENANCE_TYPE_LABELS[m.maintenanceType]}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{ASSET_MAINTENANCE_STATUS_LABELS[m.status]}</Badge>
              {canManage && m.status !== "completed" ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const next =
                      m.status === "reported"
                        ? "in_progress"
                        : m.status === "in_progress"
                          ? "completed"
                          : m.status;
                    await updateMaintenanceStatusAction(m.id, next);
                    router.refresh();
                  }}
                >
                  {m.status === "reported" ? "Rozpocznij" : "Zakończ"}
                </Button>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
