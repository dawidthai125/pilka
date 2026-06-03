"use client";

import { useActionState } from "react";
import Link from "next/link";

import {
  triggerLeagueLiveSyncAction,
  type PlatformLeagueActionState,
} from "@/features/platform/league-actions";
import { OnboardingStatusBadge } from "@/features/platform/components/onboarding-status-grid";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LeagueSetupSnapshot } from "@/lib/platform/league-setup-snapshot";
import { cn } from "@/lib/utils";

const initialState: PlatformLeagueActionState = {};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pl-PL");
}

export function LeagueStatusPanel({ snapshot }: { snapshot: LeagueSetupSnapshot }) {
  const [liveState, liveAction, livePending] = useActionState(triggerLeagueLiveSyncAction, initialState);

  const configured = snapshot.syncConfigured;
  const job = snapshot.latestJob;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide",
            configured ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200",
          )}
        >
          {configured ? "Skonfigurowano" : "Wymaga konfiguracji"}
        </span>
        {!configured ? (
          <Link href={`/platform/clubs/${snapshot.clubId}/league/setup`} className={buttonVariants({ size: "sm" })}>
            Uruchom kreator
          </Link>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/45">Ostatni sync</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatDate(snapshot.lastSyncAt)}</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/45">Następny sync (cron)</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">06:00 UTC / dzienne</CardContent>
        </Card>
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-white/45">Rekordy (ostatnie zadanie)</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {job ? `${job.recordsProcessed} OK · ${job.recordsFailed} bł.` : "—"}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader>
          <CardTitle className="text-base">Szczegóły konfiguracji</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <span className="text-white/45">Sezon:</span> {snapshot.seasonName ?? "—"}
          </div>
          <div>
            <span className="text-white/45">Rozgrywki:</span> {snapshot.competitionName ?? "—"}
          </div>
          <div>
            <span className="text-white/45">Źródło:</span> {snapshot.sourceName ?? "—"}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/45">Status źródła:</span>
            <OnboardingStatusBadge status={snapshot.sourceActive ? "complete" : "in_progress"} />
          </div>
        </CardContent>
      </Card>

      {job ? (
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-base">Ostatnie zadanie sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              Status: <strong>{job.status}</strong> · {formatDate(job.createdAt)}
            </p>
            {job.errorMessage ? (
              <p className="rounded-md bg-red-500/15 px-3 py-2 text-red-200">{job.errorMessage}</p>
            ) : null}
            {job.recordsFailed > 0 ? (
              <p className="rounded-md bg-amber-500/15 px-3 py-2 text-amber-200">
                {job.recordsFailed} rekordów nie zostało zsynchronizowanych.
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {snapshot.providerId === "mirror_live" && snapshot.sourceActive ? (
        <Card className="border-white/10 bg-white/5 text-white">
          <CardHeader>
            <CardTitle className="text-base">Pierwszy / ręczny live sync</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-white/60">
              Pobiera dane z 90minut.pl, regionalnyfutbol.pl i regiowyniki.pl (oraz mPZPN jeśli skonfigurowany).
            </p>
            {liveState.error ? (
              <p className="rounded-md bg-red-500/15 px-3 py-2 text-sm text-red-200">{liveState.error}</p>
            ) : null}
            {liveState.success ? (
              <p className="rounded-md bg-emerald-500/15 px-3 py-2 text-sm text-emerald-200">{liveState.success}</p>
            ) : null}
            <form action={liveAction}>
              <input type="hidden" name="clubId" value={snapshot.clubId} />
              <Button type="submit" disabled={livePending}>
                {livePending ? "Pobieranie…" : "Uruchom live sync"}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {snapshot.providerId === "manual_import" && snapshot.sourceActive ? (
        <Card className="border-white/10 bg-white/5 text-white">
          <CardContent className="pt-6 text-sm text-white/60">
            Import ręczny: właściciel klubu przesyła plik w panelu <strong>Liga → Import</strong>.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
