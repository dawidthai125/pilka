#!/usr/bin/env node
/**
 * Import lokalnych plików CSV/JSON (lub opcjonalnie URL) do League Hub — testy dev.
 *
 * Nie pobiera danych z DZPN/PZPN (brak publicznych plików ligowych).
 * Używa tych samych parserów co UI (/league/import).
 *
 * Wymaga w .env.local:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 *
 * Przykłady:
 *   npm run import:league-fixture
 *   npm run import:league-fixture -- --type league_table --file fixtures/league/b-klasa-table.csv
 *   npm run import:league-fixture -- --type fixtures --file fixtures/league/b-klasa-fixtures.json
 *   npm run import:league-fixture -- --type full
 *   npm run import:league-fixture -- --url https://example.com/tabela.csv --type league_table
 */

import { readFileSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import {
  parseLeagueFile,
  stableFixtureExternalId,
} from "./lib/league-import-parsers.mjs";
import { computeSyncDurationMs } from "./lib/sync-job-meta.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

dotenv.config({ path: join(root, ".env.local") });

const CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const SEASON_ID = "f9021001-0001-4000-8000-000000000001";
const COMPETITION_ID = "f9022001-0001-4000-8000-000000000001";
const SOURCE_CSV = "f9023001-0001-4000-8000-000000000001";
const SOURCE_JSON = "f9023002-0002-4000-8000-000000000002";

const MAX_TEAM_NAME_LENGTH = 120;
const MAX_TABLE_STAT = 999;

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Brak ${name} w .env.local`);
  return value;
}

function parseArgs(argv) {
  const args = {
    type: "full",
    file: null,
    url: null,
    sync: true,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--type" && argv[i + 1]) args.type = argv[++i];
    else if (a === "--file" && argv[i + 1]) args.file = argv[++i];
    else if (a === "--url" && argv[i + 1]) args.url = argv[++i];
    else if (a === "--no-sync") args.sync = false;
    else if (a === "--help" || a === "-h") args.help = true;
  }
  return args;
}

function sanitizeText(value, maxLen = MAX_TEAM_NAME_LENGTH) {
  let text = String(value ?? "").trim();
  if (!text) return "";
  while (/^[=+\-@\t\r]/.test(text)) text = text.slice(1).trimStart();
  return text.slice(0, maxLen);
}

function clampStat(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_TABLE_STAT, Math.round(value)));
}

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(new Date(`${value}T12:00:00Z`).getTime());
}

function canonicalTeamName(teamName, teams) {
  const normalized = teamName.trim().toLowerCase();
  for (const team of teams) {
    const league = team.league_name.trim().toLowerCase();
    const display = team.display_name.trim().toLowerCase();
    if (normalized === league || normalized === display || teamName.includes(team.league_name)) {
      return team.league_name.trim();
    }
  }
  return teamName.trim();
}

async function loadContent(args) {
  if (args.url) {
    console.log(`Pobieranie: ${args.url}`);
    const res = await fetch(args.url);
    if (!res.ok) throw new Error(`HTTP ${res.status} dla ${args.url}`);
    const buf = await res.arrayBuffer();
    return {
      content: new TextDecoder("utf-8").decode(buf),
      fileName: basename(new URL(args.url).pathname) || "download.csv",
    };
  }

  if (args.type === "full" && !args.file) {
    const tablePath = join(root, "fixtures/league/b-klasa-table.csv");
    const fixturesPath = join(root, "fixtures/league/b-klasa-fixtures.json");
    return {
      multi: [
        { content: readFileSync(tablePath, "utf8"), fileName: "b-klasa-table.csv", importType: "league_table", sourceId: SOURCE_CSV },
        { content: readFileSync(fixturesPath, "utf8"), fileName: "b-klasa-fixtures.json", importType: "fixtures", sourceId: SOURCE_JSON },
      ],
    };
  }

  const filePath = args.file
    ? join(root, args.file)
    : args.type === "league_table"
      ? join(root, "fixtures/league/b-klasa-table.csv")
      : join(root, "fixtures/league/b-klasa-fixtures.json");

  return {
    content: readFileSync(filePath, "utf8"),
    fileName: basename(filePath),
    importType: args.type,
    sourceId: args.type === "league_table" ? SOURCE_CSV : SOURCE_JSON,
  };
}

async function ingestPayload(supabase, { clubId, jobId, competitionId, seasonId, sourceId, payload, importType }) {
  let processed = 0;
  let failed = 0;

  if (payload.leagueTable.length > 0) {
    const snapshotAt = new Date().toISOString();
    const { data: teams } = await supabase
      .from("league_teams")
      .select("league_name, display_name, is_own_club")
      .eq("club_id", clubId)
      .eq("competition_id", competitionId);

    const rows = payload.leagueTable
      .map((row, index) => {
        const teamName = sanitizeText(row.teamName);
        if (!teamName) return null;
        const isOwn = (teams ?? []).some(
          (t) =>
            t.is_own_club &&
            (teamName.toLowerCase() === String(t.league_name).toLowerCase() ||
              teamName.toLowerCase() === String(t.display_name).toLowerCase()),
        );
        const goalsFor = clampStat(row.goalsFor);
        const goalsAgainst = clampStat(row.goalsAgainst);
        return {
          club_id: clubId,
          competition_id: competitionId,
          season_id: seasonId,
          source_id: sourceId,
          sync_job_id: jobId,
          snapshot_at: snapshotAt,
          team_name: teamName,
          position: index + 1,
          played: clampStat(row.played),
          won: clampStat(row.won),
          drawn: clampStat(row.drawn),
          lost: clampStat(row.lost),
          goals_for: goalsFor,
          goals_against: goalsAgainst,
          goal_difference: goalsFor - goalsAgainst,
          points: clampStat(row.points),
          is_own_club: isOwn,
        };
      })
      .filter(Boolean);

    const { error } = await supabase.from("league_tables").insert(rows);
    if (error) {
      failed += rows.length;
      await supabase.from("league_sync_logs").insert({
        club_id: clubId,
        job_id: jobId,
        level: "error",
        message: error.message,
      });
    } else {
      processed += rows.length;
      await supabase.from("league_sync_logs").insert({
        club_id: clubId,
        job_id: jobId,
        level: "info",
        message: `Zaimportowano tabelę: ${rows.length} drużyn.`,
      });
    }
  }

  if (payload.fixtures.length > 0) {
    const { data: teamsRaw } = await supabase
      .from("league_teams")
      .select("*")
      .eq("club_id", clubId)
      .eq("competition_id", competitionId);

    for (const row of payload.fixtures) {
      const homeTeamName = sanitizeText(row.homeTeamName);
      const awayTeamName = sanitizeText(row.awayTeamName);
      if (!homeTeamName || !awayTeamName || !isValidDate(row.matchDate)) {
        failed += 1;
        continue;
      }

      const canonicalHome = canonicalTeamName(homeTeamName, teamsRaw ?? []);
      const canonicalAway = canonicalTeamName(awayTeamName, teamsRaw ?? []);
      const externalKey =
        row.externalId?.trim()
          ? sanitizeText(String(row.externalId), 160)
          : stableFixtureExternalId(canonicalHome, canonicalAway, row.matchDate, row.roundNumber);

      const homeScore = row.homeScore != null ? clampStat(row.homeScore) : null;
      const awayScore = row.awayScore != null ? clampStat(row.awayScore) : null;
      const status = homeScore != null && awayScore != null ? "completed" : row.status ?? "scheduled";

      const { data: existing } = await supabase
        .from("league_matches")
        .select("id, home_score, away_score, sync_status, match_id")
        .eq("club_id", clubId)
        .eq("competition_id", competitionId)
        .eq("external_key", externalKey)
        .maybeSingle();

      const scoresChanged =
        existing &&
        homeScore != null &&
        (existing.home_score !== homeScore || existing.away_score !== awayScore);
      const syncStatus =
        !existing || scoresChanged
          ? "pending"
          : existing.sync_status === "synced"
            ? "synced"
            : existing.sync_status;

      const { error } = await supabase.from("league_matches").upsert(
        {
          club_id: clubId,
          competition_id: competitionId,
          season_id: seasonId,
          source_id: sourceId,
          sync_job_id: jobId,
          external_key: externalKey,
          round_number: row.roundNumber ?? null,
          match_date: row.matchDate,
          match_time: row.matchTime ?? "15:00",
          home_team_name: homeTeamName,
          away_team_name: awayTeamName,
          home_score: homeScore,
          away_score: awayScore,
          status,
          sync_status: syncStatus,
          match_id: existing?.match_id ?? null,
        },
        { onConflict: "club_id,competition_id,external_key" },
      );

      if (error) failed += 1;
      else processed += 1;
    }

    await supabase.from("league_sync_logs").insert({
      club_id: clubId,
      job_id: jobId,
      level: "info",
      message: `Terminarz/wyniki: ${payload.fixtures.length} rekordów.`,
    });
  }

  return { processed, failed };
}

async function syncTableToMatchesModule(supabase, clubId, competitionId) {
  const { data: comp } = await supabase
    .from("league_competitions")
    .select("name, season:league_seasons(name)")
    .eq("id", competitionId)
    .eq("club_id", clubId)
    .maybeSingle();
  if (!comp) return 0;

  const seasonName = comp.season?.name ?? "";
  const { data: latest } = await supabase
    .from("league_tables")
    .select("snapshot_at")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .order("snapshot_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest?.snapshot_at) return 0;

  const { data: rows } = await supabase
    .from("league_tables")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .eq("snapshot_at", latest.snapshot_at);

  let processed = 0;
  for (const row of rows ?? []) {
    const { error } = await supabase.from("league_table_entries").upsert(
      {
        club_id: clubId,
        competition: String(comp.name),
        season: seasonName,
        team_name: String(row.team_name),
        played: Number(row.played),
        won: Number(row.won),
        drawn: Number(row.drawn),
        lost: Number(row.lost),
        goals_for: Number(row.goals_for),
        goals_against: Number(row.goals_against),
        points: Number(row.points),
        is_own_club: Boolean(row.is_own_club),
      },
      { onConflict: "club_id,competition,season,team_name" },
    );
    if (!error) processed += 1;
  }
  return processed;
}

async function runImportBatch(supabase, batch) {
  const importType = batch.importType ?? "full";
  const payload = parseLeagueFile(batch.content, batch.fileName, importType);

  if (!payload.leagueTable.length && !payload.fixtures.length) {
    throw new Error(`Plik ${batch.fileName} nie zawiera rozpoznanych danych ligowych.`);
  }

  const startedAt = new Date().toISOString();
  const { data: job, error: jobError } = await supabase
    .from("league_sync_jobs")
    .insert({
      club_id: CLUB_ID,
      source_id: batch.sourceId ?? null,
      competition_id: COMPETITION_ID,
      import_type: importType,
      status: "running",
      provider: "manual_import",
      trigger_source: "cli",
      started_at: startedAt,
      metadata: { fileName: batch.fileName, adapter: "cli-fixture", note: "import:league-fixture" },
    })
    .select("id")
    .single();

  if (jobError || !job) throw new Error(jobError?.message ?? "Nie udało się utworzyć zadania sync.");

  const jobId = String(job.id);
  const ingest = await ingestPayload(supabase, {
    clubId: CLUB_ID,
    jobId,
    competitionId: COMPETITION_ID,
    seasonId: SEASON_ID,
    sourceId: batch.sourceId ?? null,
    payload,
    importType,
  });

  const completedAt = new Date().toISOString();
  await supabase
    .from("league_sync_jobs")
    .update({
      status: ingest.failed > 0 && ingest.processed === 0 ? "failed" : "completed",
      records_processed: ingest.processed,
      records_failed: ingest.failed,
      completed_at: completedAt,
      duration_ms: computeSyncDurationMs(startedAt, completedAt),
    })
    .eq("id", jobId);

  if (batch.sourceId) {
    await supabase
      .from("league_sources")
      .update({ last_sync_at: new Date().toISOString() })
      .eq("id", batch.sourceId)
      .eq("club_id", CLUB_ID);
  }

  console.log(`  ${batch.fileName}: ${ingest.processed} OK, ${ingest.failed} błędów (job ${jobId})`);
  return jobId;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`Użycie: npm run import:league-fixture -- [opcje]

Opcje:
  --type league_table|fixtures|results|full   typ importu (domyślnie: full)
  --file fixtures/league/...                  plik lokalny
  --url https://...                           pobierz plik z URL (np. własny hosting)
  --no-sync                                   pomiń sync do league_table_entries
  --help                                      ta pomoc
`);
    return;
  }

  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("League Hub — import fixture (dev)\n");

  const loaded = await loadContent(args);
  const batches = loaded.multi ?? [
    {
      content: loaded.content,
      fileName: loaded.fileName,
      importType: loaded.importType ?? args.type,
      sourceId: loaded.sourceId ?? (args.type === "league_table" ? SOURCE_CSV : SOURCE_JSON),
    },
  ];

  for (const batch of batches) {
    await runImportBatch(supabase, batch);
  }

  if (args.sync !== false) {
    const synced = await syncTableToMatchesModule(supabase, CLUB_ID, COMPETITION_ID);
    console.log(`\nSync tabeli → moduł Mecze: ${synced} wpisów.`);
  }

  console.log("\nGotowe. Sprawdź /league/table i /league/fixtures w aplikacji.");
}

main().catch((err) => {
  console.error("\nBłąd:", err.message);
  process.exit(1);
});
