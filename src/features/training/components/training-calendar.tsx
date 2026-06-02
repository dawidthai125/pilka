"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { TrainingStatusBadge } from "@/features/training/components/training-status-badge";
import {
  addDays,
  formatIsoDate,
  getCalendarRange,
  groupTrainingsByDate,
  monthGridDates,
  parseLocalDate,
  startOfWeek,
} from "@/lib/training/calendar";
import type { CalendarView, Training } from "@/types/trainings";
import type { Team } from "@/types/rbac";
import type { ClubMemberRow } from "@/lib/auth/session";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const selectClassName =
  "border-input bg-background h-9 rounded-md border px-3 text-sm shadow-xs";

const viewLabels: Record<CalendarView, string> = {
  month: "Miesiąc",
  week: "Tydzień",
  day: "Dzień",
};

function parseView(value: string | null): CalendarView {
  if (value === "week" || value === "day") return value;
  return "month";
}

export function TrainingCalendar({
  trainings,
  teams,
  coaches,
  initialView,
  initialDate,
  initialTeamId,
  initialCoachId,
  canManage,
}: {
  trainings: Training[];
  teams: Team[];
  coaches: ClubMemberRow[];
  initialView: CalendarView;
  initialDate: string;
  initialTeamId?: string;
  initialCoachId?: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = parseView(searchParams.get("view") ?? initialView);
  const anchorIso = searchParams.get("date") ?? initialDate;
  const teamFilter = searchParams.get("team") ?? initialTeamId ?? "";
  const coachFilter = searchParams.get("coach") ?? initialCoachId ?? "";

  const anchor = useMemo(() => parseLocalDate(anchorIso), [anchorIso]);
  const grouped = useMemo(() => groupTrainingsByDate(trainings), [trainings]);

  function pushParams(next: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (!value) params.delete(key);
      else params.set(key, value);
    }
    router.push(`/training?${params.toString()}`);
  }

  function shiftAnchor(days: number) {
    pushParams({ date: formatIsoDate(addDays(anchor, days)) });
  }

  function shiftMonth(delta: number) {
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    pushParams({ date: formatIsoDate(next) });
  }

  const range = getCalendarRange(view, anchor);
  const title =
    view === "month"
      ? anchor.toLocaleDateString("pl-PL", { month: "long", year: "numeric" })
      : view === "week"
        ? `${range.from} — ${range.to}`
        : anchor.toLocaleDateString("pl-PL", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(viewLabels) as CalendarView[]).map((item) => (
            <Button
              key={item}
              type="button"
              size="sm"
              variant={view === item ? "default" : "outline"}
              onClick={() => pushParams({ view: item })}
            >
              {viewLabels[item]}
            </Button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={teamFilter}
            onChange={(event) => pushParams({ team: event.target.value || undefined })}
            className={selectClassName}
          >
            <option value="">Wszystkie drużyny</option>
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
          <select
            value={coachFilter}
            onChange={(event) => pushParams({ coach: event.target.value || undefined })}
            className={selectClassName}
          >
            <option value="">Wszyscy trenerzy</option>
            {coaches.map((coach) => (
              <option key={coach.user_id} value={coach.user_id}>
                {coach.profile?.full_name ?? coach.profile?.email ?? "Trener"}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => (view === "month" ? shiftMonth(-1) : shiftAnchor(view === "week" ? -7 : -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => (view === "month" ? shiftMonth(1) : shiftAnchor(view === "week" ? 7 : 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => pushParams({ date: formatIsoDate(new Date()) })}>
            Dziś
          </Button>
        </div>
        <h2 className="text-base font-semibold capitalize sm:text-lg">{title}</h2>
        {canManage ? (
          <Link href="/training/new" className={cn(buttonVariants({ size: "sm" }), "w-full sm:w-auto")}>
            Nowy trening
          </Link>
        ) : null}
      </div>

      {view === "month" ? (
        <div className="overflow-x-auto">
          <MonthGrid anchor={anchor} grouped={grouped} />
        </div>
      ) : view === "week" ? (
        <WeekGrid anchor={anchor} grouped={grouped} />
      ) : (
        <DayList dateIso={formatIsoDate(anchor)} grouped={grouped} />
      )}
    </div>
  );
}

function TrainingCard({ training }: { training: Training }) {
  return (
    <Link
      href={`/training/${training.id}`}
      className="block rounded-md border bg-card px-2 py-1.5 text-xs transition-colors hover:bg-muted/40"
    >
      <p className="font-medium">{training.startTime} {training.name}</p>
      <p className="text-muted-foreground">{training.teamName}</p>
    </Link>
  );
}

function MonthGrid({
  anchor,
  grouped,
}: {
  anchor: Date;
  grouped: Map<string, Training[]>;
}) {
  const days = monthGridDates(anchor);
  const currentMonth = anchor.getMonth();

  return (
    <div className="min-w-[640px] overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((label) => (
          <div key={label} className="px-2 py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const iso = formatIsoDate(day);
          const items = grouped.get(iso) ?? [];
          const inMonth = day.getMonth() === currentMonth;
          return (
            <div
              key={iso}
              className={cn(
                "min-h-24 border-r border-b p-1 last:border-r-0",
                !inMonth && "bg-muted/20 text-muted-foreground",
              )}
            >
              <p className="mb-1 text-xs font-medium">{day.getDate()}</p>
              <div className="space-y-1">
                {items.slice(0, 2).map((training) => (
                  <TrainingCard key={training.id} training={training} />
                ))}
                {items.length > 2 ? (
                  <p className="px-1 text-[10px] text-muted-foreground">+{items.length - 2} więcej</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekGrid({
  anchor,
  grouped,
}: {
  anchor: Date;
  grouped: Map<string, Training[]>;
}) {
  const start = startOfWeek(anchor);
  const days = Array.from({ length: 7 }, (_, index) => addDays(start, index));

  return (
    <div className="grid gap-3 md:grid-cols-7">
      {days.map((day) => {
        const iso = formatIsoDate(day);
        const items = grouped.get(iso) ?? [];
        return (
          <div key={iso} className="rounded-xl border p-3">
            <p className="mb-2 text-sm font-semibold">
              {day.toLocaleDateString("pl-PL", { weekday: "short", day: "numeric", month: "short" })}
            </p>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground">Brak treningów</p>
              ) : (
                items.map((training) => <TrainingCard key={training.id} training={training} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayList({
  dateIso,
  grouped,
}: {
  dateIso: string;
  grouped: Map<string, Training[]>;
}) {
  const items = grouped.get(dateIso) ?? [];

  if (items.length === 0) {
    return (
      <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
        Brak treningów w wybranym dniu.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((training) => (
        <Link
          key={training.id}
          href={`/training/${training.id}`}
          className="flex flex-col gap-2 rounded-xl border p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <p className="font-semibold">{training.name}</p>
            <p className="text-sm text-muted-foreground">
              {training.startTime}–{training.endTime} · {training.teamName} · {training.location ?? "—"}
            </p>
          </div>
          <TrainingStatusBadge status={training.status} />
        </Link>
      ))}
    </div>
  );
}
