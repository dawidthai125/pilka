"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import {
  issueAssetAction,
  returnAssetAction,
} from "@/features/equipment/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ASSET_ASSIGNEE_KINDS,
  ASSET_ASSIGNEE_KIND_LABELS,
  type AssetAssignmentRow,
  type AssetRow,
} from "@/types/equipment";

export function EquipmentAssignmentsPanel({
  assignments,
  assets,
  canIssue,
}: {
  assignments: AssetAssignmentRow[];
  assets: AssetRow[];
  canIssue: boolean;
}) {
  const [state, action, pending] = useActionState(issueAssetAction, {});
  const router = useRouter();

  return (
    <div className="space-y-6">
      {canIssue ? (
        <form action={action} className="max-w-xl space-y-3 rounded-md border p-4">
          <h3 className="font-medium">Wydaj sprzęt</h3>
          <div className="space-y-2">
            <Label htmlFor="assetId">Sprzęt</Label>
            <select
              id="assetId"
              name="assetId"
              className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
              required
            >
              <option value="">Wybierz…</option>
              {assets
                .filter((a) => a.quantityAvailable > 0)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.quantityAvailable} dost.)
                  </option>
                ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="assigneeKind">Odbiorca</Label>
              <select
                id="assigneeKind"
                name="assigneeKind"
                className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
                required
              >
                {ASSET_ASSIGNEE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ASSET_ASSIGNEE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assigneeLabel">Nazwa / opis</Label>
              <Input id="assigneeLabel" name="assigneeLabel" placeholder="np. Trener główny" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="quantity">Ilość</Label>
              <Input id="quantity" name="quantity" type="number" min={1} defaultValue={1} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueAt">Termin zwrotu</Label>
              <Input id="dueAt" name="dueAt" type="date" />
            </div>
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
          <Button type="submit" disabled={pending}>
            Wydaj
          </Button>
        </form>
      ) : null}

      <div className="divide-y rounded-md border">
        {assignments.map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div>
              <p className="font-medium">{a.assetName ?? "Sprzęt"}</p>
              <p className="text-xs text-muted-foreground">
                {a.assigneeLabel ?? ASSET_ASSIGNEE_KIND_LABELS[a.assigneeKind]} · {a.quantity} szt. ·{" "}
                {a.returnedAt ? "Zwrócono" : "Aktywne"}
              </p>
            </div>
            {canIssue && !a.returnedAt ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  await returnAssetAction(a.id);
                  router.refresh();
                }}
              >
                Zwrot
              </Button>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
