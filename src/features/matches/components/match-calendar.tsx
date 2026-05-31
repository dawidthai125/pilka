"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { MatchStatusBadge } from "@/features/matches/components/match-status-badge";
import {
  addDays,
  formatIsoDate,
  groupMatchesByDate,
  monthGridDates,
  parseLocalDate,
  startOfWeek,
} from "@/lib/matches/calendar";
import type { MatchCalendarView, Match } from "@/types/matches";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const selectClassName = "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";
const viewLabels: Record<MatchCalendarView, string> = { month: "Miesiąc", week: "Tydzień", list: "Lista" };

export function MatchCalendar({
  matches,
  seasons,
  competitions,
  teams,
  initialView,
  initialDate,
  filters,
  canManage,
}: {
  matches: Match[];
  seasons: string[];
  competitions: string[];
  teams: Array<{ id: string; name: string }>;
  initialView: MatchCalendarView;
  initialDate: string;
  filters: { teamId?: string; season?: string; competition?: string };
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get("view") as MatchCalendarView) || initialView;
  const anchorIso = searchParams.get("date") ?? initialDate;
  const anchor = useMemo(() => parseLocalDate(anchorIso), [anchorIso]);
  const grouped = useMemo(() => groupMatchesByDate(matches), [matches]);

  function pushParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/matches?${params.toString()}`);
  }

  const title =
    view === "month"
      ? anchor.toLocaleDateString("pl-PL", { month: "long", year: "numeric" })
      : view === "week"
        ? `${formatIsoDate(startOfWeek(anchor))} — ${formatIsoDate(addDays(startOfWeek(anchor), 6))}`
        : "Lista meczów";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(viewLabels) as MatchCalendarView[]).map((item) => (
          <Button key={item} size="sm" variant={view === item ? "default" : "outline"} onClick={() => pushParams({ view: item })}>
            {viewLabels[item]}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3 lg:flex-row">
        <select value={filters.teamId ?? ""} onChange={(e) => pushParams({ team: e.target.value || undefined })} className={selectClassName}>
          <option value="">Wszystkie drużyny</option>
          {teams.map((t) => (<option key={t.id} value={t.id}>{t.name}</option>))}
        </select>
        <select value={filters.season ?? ""} onChange={(e) => pushParams({ season: e.target.value || undefined })} className={selectClassName}>
          <option value="">Wszystkie sezony</option>
          {seasons.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
        <select value={filters.competition ?? ""} onChange={(e) => pushParams({ competition: e.target.value || undefined })} className={selectClassName}>
          <option value="">Wszystkie rozgrywki</option>
          {competitions.map((c) => (<option key={c} value={c}>{c}</option>))}
        </select>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => pushParams({ date: formatIsoDate(addDays(anchor, view === "week" ? -7 : view === "month" ? -30 : -7)) })}>
            <ChevronLeft className="size-4" />
          </Button>
          <Button size="icon" variant="outline" onClick={() => pushParams({ date: formatIsoDate(addDays(anchor, view === "week" ? 7 : view === "month" ? 30 : 7)) })}>
            <ChevronRight className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => pushParams({ date: formatIsoDate(new Date()) })}>Dziś</Button>
        </div>
        <h2 className="text-base font-semibold capitalize sm:text-lg">{title}</h2>
        {canManage ? <Link href="/matches/new" className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}>Nowy mecz</Link> : null}
      </div>

      {view === "list" ? (
        <MatchList matches={matches} />
      ) : view === "week" ? (
        <WeekGrid anchor={anchor} grouped={grouped} />
      ) : (
        <div className="overflow-x-auto">
          <MonthGrid anchor={anchor} grouped={grouped} />
        </div>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: Match }) {
  const score = match.homeScore !== null ? `${match.homeScore}:${match.awayScore}` : null;
  return (
    <Link href={`/matches/${match.id}`} className="block rounded-md border bg-card px-2 py-1.5 text-xs hover:bg-muted/40">
      <p className="font-medium">{match.matchTime} {match.homeTeamName} — {match.awayTeamName}</p>
      {score ? <p className="text-muted-foreground">{score}</p> : null}
    </Link>
  );
}

function MatchList({ matches }: { matches: Match[] }) {
  if (!matches.length) return <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">Brak meczów.</p>;
  return (
    <div className="space-y-2">
      {matches.map((match) => (
        <Link key={match.id} href={`/matches/${match.id}`} className="flex flex-col gap-2 rounded-xl border p-4 hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold">{match.homeTeamName} — {match.awayTeamName}</p>
            <p className="text-sm text-muted-foreground">{match.matchDate} · {match.matchTime} · {match.competition} · Kolejka {match.roundNumber ?? "—"}</p>
          </div>
          <div className="flex items-center gap-2">
            {match.homeScore !== null ? <span className="font-bold">{match.homeScore}:{match.awayScore}</span> : null}
            <MatchStatusBadge status={match.status} />
          </div>
        </Link>
      ))}
    </div>
  );
}

function MonthGrid({ anchor, grouped }: { anchor: Date; grouped: Map<string, Match[]> }) {
  const days = monthGridDates(anchor);
  const currentMonth = anchor.getMonth();
  return (
    <div className="min-w-[640px] overflow-hidden rounded-xl border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((l) => (<div key={l} className="px-2 py-2">{l}</div>))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = formatIsoDate(day);
          const items = grouped.get(iso) ?? [];
          return (
            <div key={iso} className={cn("min-h-24 border-r border-b p-1", day.getMonth() !== currentMonth && "bg-muted/20 text-muted-foreground")}>
              <p className="mb-1 text-xs font-medium">{day.getDate()}</p>
              <div className="space-y-1">{items.slice(0, 2).map((m) => <MatchCard key={m.id} match={m} />)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({ anchor, grouped }: { anchor: Date; grouped: Map<string, Match[]> }) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day) => {
        const iso = formatIsoDate(day);
        const items = grouped.get(iso) ?? [];
        return (
          <div key={iso} className="rounded-xl border p-3">
            <p className="mb-2 text-sm font-semibold">{day.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}</p>
            <div className="space-y-2">{items.length ? items.map((m) => <MatchCard key={m.id} match={m} />) : <p className="text-xs text-muted-foreground">Brak</p>}</div>
          </div>
        );
      })}
    </div>
  );
}
