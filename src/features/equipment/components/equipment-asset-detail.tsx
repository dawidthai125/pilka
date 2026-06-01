"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { returnAssetAction } from "@/features/equipment/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ASSET_ASSIGNEE_KIND_LABELS,
  ASSET_CONDITION_LABELS,
  ASSET_MAINTENANCE_STATUS_LABELS,
  ASSET_MAINTENANCE_TYPE_LABELS,
  type AssetAssignmentRow,
  type AssetMaintenanceRow,
  type AssetRow,
} from "@/types/equipment";
import { CONDITION_BADGE_VARIANT } from "@/lib/equipment/constants";

export function EquipmentAssetDetail({
  asset,
  assignments,
  maintenance,
  canIssue,
}: {
  asset: AssetRow;
  assignments: AssetAssignmentRow[];
  maintenance: AssetMaintenanceRow[];
  canIssue: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-6">
      <div className="rounded-md border p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">{asset.name}</h2>
            <p className="text-sm text-muted-foreground">
              {asset.categoryName} · {asset.inventoryNumber ?? "brak nr inw."}
            </p>
          </div>
          <Badge variant={CONDITION_BADGE_VARIANT[asset.condition]}>
            {ASSET_CONDITION_LABELS[asset.condition]}
          </Badge>
        </div>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground">Lokalizacja</dt>
            <dd>{asset.location ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Data zakupu</dt>
            <dd>{asset.purchaseDate ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Wartość</dt>
            <dd>{asset.purchaseValue != null ? `${asset.purchaseValue} PLN` : "—"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Dostępność</dt>
            <dd>
              {asset.quantityAvailable} / {asset.quantity}
            </dd>
          </div>
        </dl>
        {asset.description ? (
          <p className="mt-3 text-sm text-muted-foreground">{asset.description}</p>
        ) : null}
      </div>

      <section>
        <h3 className="mb-2 font-medium">Historia wydań</h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak wydań.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {assignments.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {a.assigneeLabel ?? ASSET_ASSIGNEE_KIND_LABELS[a.assigneeKind]} · {a.quantity} szt.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Wydano: {new Date(a.issuedAt).toLocaleDateString("pl-PL")}
                    {a.returnedAt
                      ? ` · Zwrócono: ${new Date(a.returnedAt).toLocaleDateString("pl-PL")}`
                      : " · Aktywne wydanie"}
                  </p>
                </div>
                {canIssue && !a.returnedAt ? (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      startTransition(async () => {
                        await returnAssetAction(a.id);
                        router.refresh();
                      })
                    }
                  >
                    Zarejestruj zwrot
                  </Button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h3 className="mb-2 font-medium">Konserwacja</h3>
        {maintenance.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak zgłoszeń.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {maintenance.map((m) => (
              <div key={m.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{m.title}</p>
                <p className="text-xs text-muted-foreground">
                  {ASSET_MAINTENANCE_TYPE_LABELS[m.maintenanceType]} ·{" "}
                  {ASSET_MAINTENANCE_STATUS_LABELS[m.status]}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
