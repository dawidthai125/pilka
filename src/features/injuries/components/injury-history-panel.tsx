import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlayerInjuryHistorySummary } from "@/types/injuries";
import { INJURY_RECORD_STATUS_LABELS } from "@/types/injuries";

export function InjuryHistoryPanel({ summaries }: { summaries: PlayerInjuryHistorySummary[] }) {
  if (!summaries.length) {
    return <p className="text-sm text-muted-foreground">Brak historii urazów.</p>;
  }

  return (
    <div className="space-y-4">
      {summaries.map((summary) => (
        <Card key={summary.playerId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{summary.playerName}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {summary.injuryCount} urazów · szac. {summary.totalAbsenceDays} dni nieobecności
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.injuries.slice(0, 5).map((injury) => (
              <div key={injury.id} className="rounded-md border px-3 py-2 text-sm">
                <p className="font-medium">
                  {injury.injuryDate} — {INJURY_RECORD_STATUS_LABELS[injury.injuryStatus]}
                </p>
                <p className="text-muted-foreground">{injury.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
