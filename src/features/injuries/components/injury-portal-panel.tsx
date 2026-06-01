import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  INJURY_RECORD_STATUS_LABELS,
  RETURN_TO_MATCH_STATUS_LABELS,
  RETURN_TO_TRAINING_STATUS_LABELS,
  type PlayerInjuryRow,
} from "@/types/injuries";
import { INJURY_MODULE_DISCLAIMER } from "@/lib/injuries/constants";

export function InjuryPortalPanel({ injuries }: { injuries: PlayerInjuryRow[] }) {
  return (
    <div className="space-y-4">
      <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        {INJURY_MODULE_DISCLAIMER}
      </p>
      {!injuries.length ? (
        <p className="text-sm text-muted-foreground">Brak aktywnych wpisów urazowych.</p>
      ) : (
        injuries.map((injury) => (
          <Link key={injury.id} href={`/injuries/${injury.id}`}>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Status sportowy</CardTitle>
                  <Badge>{INJURY_RECORD_STATUS_LABELS[injury.injuryStatus]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Od {injury.injuryDate}
                  {injury.expectedReturnDate ? ` · planowany powrót ${injury.expectedReturnDate}` : ""}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{injury.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
      <p className="text-xs text-muted-foreground">
        Powrót do treningów / meczów aktualizuje sztab szkoleniowy w module Injury & Medical.
      </p>
    </div>
  );
}

export function InjuryPortalStatusLabels() {
  return (
    <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
      <div>
        <p className="font-medium text-foreground">Trening</p>
        {Object.entries(RETURN_TO_TRAINING_STATUS_LABELS).map(([k, v]) => (
          <p key={k}>
            {k}: {v}
          </p>
        ))}
      </div>
      <div>
        <p className="font-medium text-foreground">Mecz</p>
        {Object.entries(RETURN_TO_MATCH_STATUS_LABELS).map(([k, v]) => (
          <p key={k}>
            {k}: {v}
          </p>
        ))}
      </div>
    </div>
  );
}
