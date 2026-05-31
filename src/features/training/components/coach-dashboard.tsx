import Link from "next/link";

import { TrainingStatusBadge } from "@/features/training/components/training-status-badge";
import type { CoachDashboardData } from "@/types/trainings";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CoachDashboard({ data }: { data: CoachDashboardData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Potwierdzeni" value={data.confirmedCount} hint="obecni na najbliższym treningu" />
        <StatCard title="Niepotwierdzeni" value={data.unconfirmedCount} hint="bez potwierdzenia obecności" />
        <StatCard title="Kontuzjowani" value={data.injuredPlayers.length} hint="aktywni wpisy" />
        <StatCard
          title="Nadchodzące"
          value={data.upcomingTrainings.length}
          hint="zaplanowane treningi"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Najbliższe treningi</CardTitle>
            <CardDescription>Pięć kolejnych terminów w harmonogramie.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.upcomingTrainings.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak zaplanowanych treningów.</p>
            ) : (
              data.upcomingTrainings.map((training) => (
                <Link
                  key={training.id}
                  href={`/training/${training.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/30"
                >
                  <div>
                    <p className="font-medium">{training.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {training.trainingDate} · {training.startTime}
                    </p>
                  </div>
                  <TrainingStatusBadge status={training.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Zawodnicy kontuzjowani</CardTitle>
            <CardDescription>Status „kontuzjowany” w module zawodników.</CardDescription>
          </CardHeader>
          <CardContent>
            {data.injuredPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Brak kontuzjowanych zawodników.</p>
            ) : (
              <ul className="space-y-2">
                {data.injuredPlayers.map((player) => (
                  <li key={player.id}>
                    <Link
                      href={`/players/${player.id}`}
                      className="text-sm font-medium hover:underline"
                    >
                      {player.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <EngagementList title="TOP 10 — zaangażowanie" players={data.topEngaged} />
        <EngagementList
          title="TOP 10 — najmniej aktywni"
          players={data.leastEngaged}
          muted
        />
      </div>

      <Link href="/training/ranking" className={cn(buttonVariants({ variant: "outline" }))}>
        Pełny ranking zaangażowania
      </Link>
    </div>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: number;
  hint: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function EngagementList({
  title,
  players,
  muted,
}: {
  title: string;
  players: CoachDashboardData["topEngaged"];
  muted?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {players.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak danych frekwencyjnych.</p>
        ) : (
          <ol className="space-y-2">
            {players.map((player, index) => (
              <li
                key={player.playerId}
                className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span className={muted ? "text-muted-foreground" : undefined}>
                  {index + 1}. {player.playerName}
                </span>
                <span className="font-medium">{player.engagementScore}%</span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
