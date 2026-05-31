"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createInventoryItem } from "@/features/inventory/actions";
import {
  INVENTORY_ITEM_STATUS_LABELS,
  formatMoney,
  inventoryStatusVariant,
} from "@/lib/inventory/constants";
import type { InventoryCategory, InventoryItem, InventorySupplier } from "@/types/inventory";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventoryItemsPanel({
  items,
  categories,
  suppliers,
  canManage,
}: {
  items: InventoryItem[];
  categories: InventoryCategory[];
  suppliers: InventorySupplier[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(createInventoryItem, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Nowa pozycja magazynowa</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <select name="categoryId" required className={inputClass}>
              <option value="">Kategoria</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input name="name" placeholder="Nazwa" required className={inputClass} />
            <input name="inventoryNumber" placeholder="Numer inwentarzowy" required className={inputClass} />
            <input name="internalCode" placeholder="Kod wewnętrzny" className={inputClass} />
            <input name="quantity" type="number" min={1} placeholder="Ilość" required className={inputClass} />
            <input name="minStockLevel" type="number" min={0} placeholder="Min. stan" className={inputClass} />
            <input name="purchaseDate" type="date" className={inputClass} />
            <input name="purchasePrice" type="number" step="0.01" placeholder="Cena zakupu" className={inputClass} />
            <select name="supplierId" className={inputClass}>
              <option value="">Bez dostawcy</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input name="photo" type="file" accept="image/*" className={inputClass} />
          </div>
          <textarea name="description" placeholder="Opis" rows={2} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Dodaj pozycję</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Nr inw.</th>
              <th className="px-4 py-3">Kategoria</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Dostępne</th>
              <th className="px-4 py-3">Wydane</th>
              <th className="px-4 py-3">Uszkodzone</th>
              <th className="px-4 py-3">Cena</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span>{item.name}</span>
                    {item.isLowStock ? (
                      <Badge variant="destructive">Niski stan</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3">{item.inventoryNumber}</td>
                <td className="px-4 py-3">{item.categoryName ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={inventoryStatusVariant(item.status)}>
                    {INVENTORY_ITEM_STATUS_LABELS[item.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">{item.quantityAvailable} / {item.quantityTotal}</td>
                <td className="px-4 py-3">{item.quantityIssued}</td>
                <td className="px-4 py-3">{item.quantityDamaged}</td>
                <td className="px-4 py-3">
                  {item.purchasePrice != null ? formatMoney(item.purchasePrice) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
