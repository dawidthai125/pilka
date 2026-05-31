import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { InventoryAlert } from "@/types/inventory";

export function InventoryAlerts({ alerts }: { alerts: InventoryAlert[] }) {
  if (!alerts.length) {
    return (
      <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
        Brak aktywnych alertów magazynowych.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {alerts.map((alert) => (
        <li key={alert.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium">{alert.title}</p>
                <Badge variant={alert.severity === "destructive" ? "destructive" : "secondary"}>
                  Alert
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{alert.message}</p>
            </div>
            {alert.href ? (
              <Link href={alert.href} className="text-sm text-primary underline">
                Zobacz
              </Link>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
