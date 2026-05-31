import type { PlayerFormStats, TeamFormStats, TeamMatchStats } from "@/types/matches";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TeamFormStatsPanel({
  teamStats,
  playerForm,
}: {
  teamStats: { stats: TeamMatchStats; form: TeamFormStats; ownTeamName: string };
  playerForm: PlayerFormStats[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Forma drużyny</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Ostatnie 5 meczów: <strong>{teamStats.form.last5 || "—"}</strong></p>
          <p>Ostatnie 10 meczów: <strong>{teamStats.form.last10 || "—"}</strong></p>
          <p>
            Bilans: {teamStats.stats.wins}Z / {teamStats.stats.draws}R / {teamStats.stats.losses}P ·{" "}
            {teamStats.stats.goalsFor}:{teamStats.stats.goalsAgainst}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Forma zawodników (30 dni)</CardTitle>
        </CardHeader>
        <CardContent>
          {playerForm.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak danych.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {playerForm.slice(0, 5).map((p) => (
                <li key={p.playerId}>
                  {p.playerName}: {p.matchesLast30Days} M, {p.goals} G, {p.assists} A, {p.minutes} min
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
