import { Badge } from "@/components/ui/badge";
import { INVENTORY_RETURN_CONDITION_LABELS } from "@/lib/inventory/constants";
import type { PlayerInventoryPortalData } from "@/types/inventory";

export function PlayerInventoryPortal({ data }: { data: PlayerInventoryPortalData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Zawodnik</p>
        <p className="text-xl font-semibold">{data.playerName}</p>
        {data.kit ? (
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p>Numer: {data.kit.jerseyNumber ?? "—"}</p>
            <p>Koszulka: {data.kit.jerseySize ?? "—"}</p>
            <p>Spodenki: {data.kit.shortsSize ?? "—"}</p>
            <p>Dres: {data.kit.tracksuitSize ?? "—"}</p>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Brak zapisanych danych stroju.</p>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Przypisany sprzęt</h2>
        <ul className="space-y-2">
          {data.assignments.length ? (
            data.assignments.map((a) => (
              <li key={a.id} className="rounded-xl border p-4 text-sm">
                <p className="font-medium">{a.kitName}</p>
                <p className="text-muted-foreground">
                  Od: {a.assignedDate}
                  {a.returnedDate ? ` · Zwrócono: ${a.returnedDate}` : " · W użyciu"}
                </p>
              </li>
            ))
          ) : (
            <li className="rounded-xl border p-4 text-sm text-muted-foreground">Brak przypisań.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Wydany sprzęt</h2>
        <ul className="space-y-2">
          {data.issues.length ? (
            data.issues.map((issue) => (
              <li key={issue.id} className="rounded-xl border p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="font-medium">{issue.itemName ?? "—"}</span>
                  <span>{issue.quantity} szt.</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  Wydano: {issue.issueDate}
                  {issue.expectedReturnDate ? ` · Zwrot do: ${issue.expectedReturnDate}` : null}
                </p>
              </li>
            ))
          ) : (
            <li className="rounded-xl border p-4 text-sm text-muted-foreground">Brak wydań.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Historia zwrotów</h2>
        <ul className="space-y-2">
          {data.returns.length ? (
            data.returns.map((ret) => (
              <li key={ret.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{ret.itemName ?? "—"}</p>
                  <p className="text-sm text-muted-foreground">{ret.returnDate} · {ret.quantity} szt.</p>
                </div>
                <Badge variant={ret.condition === "functional" ? "default" : "destructive"}>
                  {INVENTORY_RETURN_CONDITION_LABELS[ret.condition]}
                </Badge>
              </li>
            ))
          ) : (
            <li className="rounded-xl border p-4 text-sm text-muted-foreground">Brak zwrotów.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
