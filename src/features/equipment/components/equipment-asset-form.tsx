"use client";

import { useActionState } from "react";

import { upsertAssetAction } from "@/features/equipment/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ASSET_CONDITIONS,
  ASSET_CONDITION_LABELS,
  type AssetCategoryRow,
  type AssetRow,
} from "@/types/equipment";

export function EquipmentAssetForm({
  categories,
  asset,
}: {
  categories: AssetCategoryRow[];
  asset?: AssetRow;
}) {
  const [state, action, pending] = useActionState(upsertAssetAction, {});

  return (
    <form action={action} className="max-w-xl space-y-4 rounded-md border p-4">
      {asset ? <input type="hidden" name="assetId" value={asset.id} /> : null}
      <div className="space-y-2">
        <Label htmlFor="name">Nazwa</Label>
        <Input id="name" name="name" defaultValue={asset?.name} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="categoryId">Kategoria</Label>
        <select
          id="categoryId"
          name="categoryId"
          className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
          defaultValue={asset?.categoryId}
          required
        >
          <option value="">Wybierz…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="inventoryNumber">Numer inwentarzowy</Label>
          <Input id="inventoryNumber" name="inventoryNumber" defaultValue={asset?.inventoryNumber ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="condition">Stan</Label>
          <select
            id="condition"
            name="condition"
            className="flex h-10 w-full rounded-md border bg-background px-3 text-sm"
            defaultValue={asset?.condition ?? "good"}
          >
            {ASSET_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {ASSET_CONDITION_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Opis</Label>
        <Input id="description" name="description" defaultValue={asset?.description ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="purchaseDate">Data zakupu</Label>
          <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={asset?.purchaseDate ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="purchaseValue">Wartość (PLN)</Label>
          <Input id="purchaseValue" name="purchaseValue" type="number" step="0.01" defaultValue={asset?.purchaseValue ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quantity">Ilość</Label>
          <Input id="quantity" name="quantity" type="number" min={1} defaultValue={asset?.quantity ?? 1} disabled={!!asset} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Lokalizacja</Label>
        <Input id="location" name="location" defaultValue={asset?.location ?? ""} />
      </div>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>
        {asset ? "Zapisz" : "Dodaj do rejestru"}
      </Button>
    </form>
  );
}
