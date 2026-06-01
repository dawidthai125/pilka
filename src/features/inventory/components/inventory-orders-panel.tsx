"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createInventoryPurchaseOrder } from "@/features/inventory/actions";
import { INVENTORY_ORDER_STATUS_LABELS } from "@/lib/inventory/constants";
import type { InventoryPurchaseOrder, InventorySupplier } from "@/types/inventory";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventoryOrdersPanel({
  orders,
  suppliers,
  canManage,
  defaultDate,
}: {
  orders: InventoryPurchaseOrder[];
  suppliers: InventorySupplier[];
  canManage: boolean;
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(createInventoryPurchaseOrder, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Nowe zamówienie</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="orderNumber" placeholder="Numer zamówienia" required className={inputClass} />
            <select name="supplierId" className={inputClass}>
              <option value="">Dostawca (opcjonalnie)</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <input name="description" placeholder="Opis pozycji" required className={inputClass} />
            <input name="quantity" type="number" min={1} placeholder="Ilość" required className={inputClass} />
            <input name="unitPrice" type="number" step="0.01" placeholder="Cena jednostkowa" className={inputClass} />
            <select name="status" className={inputClass}>
              {Object.entries(INVENTORY_ORDER_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input name="orderDate" type="date" required defaultValue={defaultDate} className={inputClass} />
            <input name="expectedDelivery" type="date" className={inputClass} />
          </div>
          <textarea name="notes" placeholder="Uwagi" rows={2} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Utwórz zamówienie</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Nr zamówienia</th>
              <th className="px-4 py-3">Dostawca</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Dostawa</th>
              <th className="px-4 py-3">Pozycje</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b last:border-0">
                <td className="px-4 py-3">{order.orderNumber}</td>
                <td className="px-4 py-3">{order.supplierName ?? "—"}</td>
                <td className="px-4 py-3">
                  <Badge variant={order.status === "delivered" ? "default" : "secondary"}>
                    {INVENTORY_ORDER_STATUS_LABELS[order.status]}
                  </Badge>
                </td>
                <td className="px-4 py-3">{order.orderDate}</td>
                <td className="px-4 py-3">{order.expectedDelivery ?? "—"}</td>
                <td className="px-4 py-3">{order.linesCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
