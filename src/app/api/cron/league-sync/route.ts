import { NextResponse } from "next/server";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

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
  const scriptPath = join(process.cwd(), "scripts/sync-league-live.mjs");
  const result = spawnSync(process.execPath, [scriptPath, "--json"], {
    env: process.env,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });

  if (result.status !== 0) {
    return NextResponse.json(
      {
        ok: false,
        error: result.stderr?.trim() || result.stdout?.trim() || "Sync failed",
        exitCode: result.status,
      },
      { status: 500 },
    );
  }

  try {
    const lines = (result.stdout ?? "").trim().split("\n");
    const jsonLine = lines.find((line) => line.startsWith("{"));
    const payload = jsonLine ? JSON.parse(jsonLine) : { ok: true, raw: result.stdout };
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ ok: true, output: result.stdout });
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
