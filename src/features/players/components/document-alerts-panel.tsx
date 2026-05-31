import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { DOCUMENT_ALERT_LABELS, formatAlertMessage } from "@/lib/players/documents";
import type { DocumentAlert } from "@/types/players";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const alertStyles = {
  expired: "border-destructive/40 bg-destructive/5",
  days_7: "border-destructive/30 bg-destructive/5",
  days_14: "border-amber-500/30 bg-amber-500/5",
  days_30: "border-yellow-500/30 bg-yellow-500/5",
} as const;

export function DocumentAlertsPanel({ alerts }: { alerts: DocumentAlert[] }) {
  if (alerts.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="size-4 text-amber-500" />
          Powiadomienia — dokumenty zawodników
        </CardTitle>
        <CardDescription>
          Automatyczne alerty: 30, 14, 7 dni przed wygaśnięciem oraz po terminie.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {alerts.slice(0, 8).map((alert) => (
          <div
            key={alert.documentId}
            className={cn(
              "flex flex-col gap-2 rounded-lg border px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
              alertStyles[alert.alertLevel],
            )}
          >
            <div>
              <p className="text-sm font-medium">{formatAlertMessage(alert)}</p>
              <p className="text-xs text-muted-foreground">
                {DOCUMENT_ALERT_LABELS[alert.alertLevel]}
              </p>
            </div>
            <Link
              href={`/players/${alert.playerId}?tab=documents`}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
            >
              Otwórz
            </Link>
          </div>
        ))}
        {alerts.length > 8 ? (
          <p className="text-sm text-muted-foreground">
            + {alerts.length - 8} kolejnych alertów
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
