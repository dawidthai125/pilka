import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  INJURY_AVAILABILITY_IMPACT_LABELS,
  INJURY_RECORD_STATUS_LABELS,
  type PlayerInjuryRow,
} from "@/types/injuries";

export function InjuryRegistryList({ injuries }: { injuries: PlayerInjuryRow[] }) {
  if (!injuries.length) {
    return <p className="text-sm text-muted-foreground">Brak wpisów w rejestrze urazów.</p>;
  }

  return (
    <div className="space-y-3">
      {injuries.map((injury) => (
        <Link key={injury.id} href={`/injuries/${injury.id}`}>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">{injury.playerName ?? "Zawodnik"}</CardTitle>
                <Badge variant={injury.injuryStatus === "closed" ? "secondary" : "destructive"}>
                  {INJURY_RECORD_STATUS_LABELS[injury.injuryStatus]}
                </Badge>
                {injury.availabilityImpact ? (
                  <Badge variant="outline">
                    {INJURY_AVAILABILITY_IMPACT_LABELS[injury.availabilityImpact]}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                {injury.categoryName ?? "Bez kategorii"} · {injury.teamName ?? "—"} ·{" "}
                {injury.injuryDate}
                {injury.expectedReturnDate ? ` → ${injury.expectedReturnDate}` : ""}
              </p>
            </CardHeader>
            <CardContent>
              <p className="line-clamp-2 text-sm">{injury.description}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
