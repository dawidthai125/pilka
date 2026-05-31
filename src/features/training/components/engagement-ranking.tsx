"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { ATTENDANCE_SCOPE_LABELS } from "@/lib/training/constants";
import type { AttendanceScope, PlayerAttendanceStats } from "@/types/trainings";
import type { Team } from "@/types/rbac";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const selectClassName =
  "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";

export function EngagementRanking({
  stats,
  teams,
  scope,
  teamId,
}: {
  stats: PlayerAttendanceStats[];
  teams: Team[];
  scope: AttendanceScope;
  teamId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value) params.delete(key);
    else params.set(key, value);
    router.push(`/training/ranking?${params.toString()}`);
  }

  const top = stats.slice(0, 10);
  const bottom = [...stats].reverse().slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={scope}
          onChange={(event) => updateParam("scope", event.target.value)}
          className={selectClassName}
        >
          {Object.entries(ATTENDANCE_SCOPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={teamId ?? ""}
          onChange={(event) => updateParam("team", event.target.value)}
          className={selectClassName}
        >
          <option value="">Wszystkie drużyny</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RankingTable title="Najbardziej zaangażowani" players={top} />
        <RankingTable title="Najmniej aktywni" players={bottom} muted />
      </div>
    </div>
  );
}

function RankingTable({
  title,
  players,
  muted,
}: {
  title: string;
  players: PlayerAttendanceStats[];
  muted?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Frekwencja, punktualność i wskaźnik zaangażowania.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-3">#</th>
              <th className="py-2 pr-3">Zawodnik</th>
              <th className="py-2 pr-3">Obecności</th>
              <th className="py-2 pr-3">Nieob.</th>
              <th className="py-2 pr-3">Spóźn.</th>
              <th className="py-2 pr-3">Frekw.</th>
              <th className="py-2">Wskaźnik</th>
            </tr>
          </thead>
          <tbody>
            {players.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-muted-foreground">
                  Brak danych w wybranym zakresie.
                </td>
              </tr>
            ) : (
              players.map((player, index) => (
                <tr key={player.playerId} className="border-b last:border-0">
                  <td className="py-2 pr-3">{index + 1}</td>
                  <td className={`py-2 pr-3 font-medium ${muted ? "text-muted-foreground" : ""}`}>
                    {player.playerName}
                  </td>
                  <td className="py-2 pr-3">{player.present}</td>
                  <td className="py-2 pr-3">{player.absent}</td>
                  <td className="py-2 pr-3">{player.late}</td>
                  <td className="py-2 pr-3">{player.attendanceRate}%</td>
                  <td className="py-2 font-semibold">{player.engagementScore}%</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
