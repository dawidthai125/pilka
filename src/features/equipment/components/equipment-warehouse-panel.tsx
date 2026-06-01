"use client";

import { useMemo, useState } from "react";

import { EquipmentAssetsList } from "@/features/equipment/components/equipment-assets-list";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssetCategoryRow, AssetCondition, AssetRow } from "@/types/equipment";
import { ASSET_CONDITIONS, ASSET_CONDITION_LABELS } from "@/types/equipment";

export function EquipmentWarehousePanel({
  assets,
  categories,
}: {
  assets: AssetRow[];
  categories: AssetCategoryRow[];
}) {
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState<AssetCondition | "">("");
  const [location, setLocation] = useState("");

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      if (categoryId && a.categoryId !== categoryId) return false;
      if (condition && a.condition !== condition) return false;
      if (location && !(a.location ?? "").toLowerCase().includes(location.toLowerCase())) return false;
      return true;
    });
  }, [assets, categoryId, condition, location]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-md border p-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Kategoria</Label>
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">Wszystkie</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Stan</Label>
          <select
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            value={condition}
            onChange={(e) => setCondition(e.target.value as AssetCondition | "")}
          >
            <option value="">Wszystkie</option>
            {ASSET_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {ASSET_CONDITION_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label>Lokalizacja</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="np. Magazyn A" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{filtered.length} pozycji</p>
      <EquipmentAssetsList assets={filtered} />
    </div>
  );
}
