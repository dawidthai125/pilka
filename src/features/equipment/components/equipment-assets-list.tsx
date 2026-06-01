"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { ASSET_CONDITION_LABELS, type AssetRow } from "@/types/equipment";
import { CONDITION_BADGE_VARIANT } from "@/lib/equipment/constants";

export function EquipmentAssetsList({ assets }: { assets: AssetRow[] }) {
  if (!assets.length) {
    return <p className="text-sm text-muted-foreground">Brak pozycji w rejestrze.</p>;
  }

  return (
    <div className="divide-y rounded-md border">
      {assets.map((asset) => (
        <Link
          key={asset.id}
          href={`/equipment/assets/${asset.id}`}
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors hover:bg-muted/50"
        >
          <div>
            <p className="font-medium">{asset.name}</p>
            <p className="text-xs text-muted-foreground">
              {asset.categoryName ?? "—"} · {asset.inventoryNumber ?? "brak nr inw."}
              {asset.location ? ` · ${asset.location}` : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={CONDITION_BADGE_VARIANT[asset.condition]}>
              {ASSET_CONDITION_LABELS[asset.condition]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {asset.quantityAvailable}/{asset.quantity} dost.
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
