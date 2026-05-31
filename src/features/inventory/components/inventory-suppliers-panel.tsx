"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { createInventorySupplier } from "@/features/inventory/actions";
import type { InventorySupplier } from "@/types/inventory";

const inputClass = "border-input min-h-[44px] w-full rounded-md border px-3";

export function InventorySuppliersPanel({
  suppliers,
  canManage,
}: {
  suppliers: InventorySupplier[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(createInventorySupplier, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={action} className="space-y-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">Nowy dostawca</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="name" placeholder="Nazwa firmy" required className={inputClass} />
            <input name="contactName" placeholder="Osoba kontaktowa" className={inputClass} />
            <input name="phone" placeholder="Telefon" className={inputClass} />
            <input name="email" type="email" placeholder="E-mail" className={inputClass} />
          </div>
          <textarea name="address" placeholder="Adres" rows={2} className="border-input w-full rounded-md border px-3 py-2" />
          <Button type="submit" disabled={pending}>Dodaj dostawcę</Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Nazwa</th>
              <th className="px-4 py-3">Kontakt</th>
              <th className="px-4 py-3">Telefon</th>
              <th className="px-4 py-3">E-mail</th>
            </tr>
          </thead>
          <tbody>
            {suppliers.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
                <td className="px-4 py-3">{s.name}</td>
                <td className="px-4 py-3">{s.contactName ?? "—"}</td>
                <td className="px-4 py-3">{s.phone ?? "—"}</td>
                <td className="px-4 py-3">{s.email ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
