import { NextResponse } from "next/server";

import { runLeagueSync } from "@/lib/league/runtime";

/** Pełny sync (fetch + DB) — wymaga planu z wydłużonym limitem funkcji. */
export const maxDuration = 300;

function isAuthorized(request: Request): boolean {
  const secret = process.env.LEAGUE_SYNC_CRON_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/**
 * Cron (Vercel GET) / ręczne wywołanie POST: synchronizacja danych ligowych.
 */
async function runSync() {
  try {
    const result = await runLeagueSync({ triggerSource: "cron" });
    if (!result.ok) {
      const firstError = result.results.find((r) => !r.ok)?.error ?? "Sync failed";
      return NextResponse.json(
        {
          ok: false,
          error: firstError,
          recordsProcessed: result.recordsProcessed,
          recordsFailed: result.recordsFailed,
          durationMs: result.durationMs,
          jobIds: result.jobIds,
          results: result.results,
        },
        { status: 500 },
      );
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : "Sync failed",
      },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    const secret = process.env.LEAGUE_SYNC_CRON_SECRET ?? process.env.CRON_SECRET;
    if (!secret) {
      return NextResponse.json({
        endpoint: "/api/cron/league-sync",
        methods: ["GET", "POST"],
        auth: "Authorization: Bearer LEAGUE_SYNC_CRON_SECRET (lub CRON_SECRET na Vercel)",
        schedule: "codziennie o 06:00 UTC",
        cli: "npm run sync:league-live",
        runtime: "runLeagueSync() in-process",
        sources: ["90minut.pl", "regionalnyfutbol.pl", "regiowyniki.pl"],
        mapping: "league_teams.league_name → league_teams.display_name (per club, from DB)",
      });
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runSync();
}
