import {
  EQUIPMENT_KIT_TYPE_LABELS,
  type AssetAssignmentRow,
  type EquipmentKitRow,
} from "@/types/equipment";

export function EquipmentPortalPanel({
  assignments,
  kits,
}: {
  assignments: AssetAssignmentRow[];
  kits: EquipmentKitRow[];
}) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 font-medium">Wydany sprzęt</h3>
        {assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak aktywnych wydań.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {assignments.map((a) => (
              <div key={a.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{a.assetName ?? "Sprzęt"}</p>
                <p className="text-muted-foreground">
                  {a.quantity} szt. · wydano {new Date(a.issuedAt).toLocaleDateString("pl-PL")}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
      <section>
        <h3 className="mb-2 font-medium">Stroje</h3>
        {kits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak przypisanych strojów.</p>
        ) : (
          <div className="divide-y rounded-md border">
            {kits.map((k) => (
              <div key={k.id} className="px-4 py-3 text-sm">
                <p className="font-medium">{EQUIPMENT_KIT_TYPE_LABELS[k.kitType]}</p>
                <p className="text-muted-foreground">
                  {k.jerseyNumber != null ? `Nr ${k.jerseyNumber} · ` : ""}Rozmiar {k.size}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
