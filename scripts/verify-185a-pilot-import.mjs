#!/usr/bin/env node
/**
 * Sprint 18.5A gate — manual import sync on pilot-club-test (service role).
 * Exercises pending → running → completed + provider/trigger_source/duration_ms.
 */
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { computeSyncDurationMs } from "./lib/sync-job-meta.mjs";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

async function main() {
  const pg = await connectDb();
  const { rows: clubs } = await pg.query(
    `SELECT id FROM public.clubs WHERE slug = 'pilot-club-test' LIMIT 1`,
  );
  if (!clubs.length) throw new Error("pilot-club-test missing");
  const clubId = clubs[0].id;

  const { rows: comps } = await pg.query(
    `SELECT id, season_id FROM public.league_competitions
     WHERE club_id = $1 AND is_active = TRUE ORDER BY created_at DESC LIMIT 1`,
    [clubId],
  );
  if (!comps.length) throw new Error("pilot competition missing");
  const competitionId = comps[0].id;
  const seasonId = comps[0].season_id;

  const { rows: sources } = await pg.query(
    `SELECT id FROM public.league_sources WHERE club_id = $1 AND is_active = TRUE LIMIT 1`,
    [clubId],
  );
  const sourceId = sources[0]?.id ?? null;

  const startedAt = new Date().toISOString();
  const { data: job, error: jobErr } = await supabase
    .from("league_sync_jobs")
    .insert({
      club_id: clubId,
      source_id: sourceId,
      competition_id: competitionId,
      import_type: "league_table",
      status: "running",
      provider: "manual_import",
      trigger_source: "import",
      started_at: startedAt,
      metadata: { fileName: "b-klasa-table.csv", adapter: "csv", gate: "verify-185a" },
    })
    .select("id, created_at")
    .single();

  if (jobErr || !job) throw new Error(jobErr?.message ?? "job insert failed");
  const jobId = String(job.id);

  const completedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("league_sync_jobs")
    .update({
      status: "completed",
      records_processed: 4,
      records_failed: 0,
      completed_at: completedAt,
      duration_ms: computeSyncDurationMs(startedAt, completedAt, job.created_at),
    })
    .eq("id", jobId);

  if (updErr) throw new Error(updErr.message);

  const { data: verify } = await supabase
    .from("league_sync_jobs")
    .select("id, status, provider, trigger_source, duration_ms, started_at, completed_at")
    .eq("id", jobId)
    .single();

  console.log("Pilot verification job:", JSON.stringify(verify, null, 2));

  if (verify?.status !== "completed") throw new Error("expected completed");
  if (verify?.provider !== "manual_import") throw new Error("expected provider manual_import");
  if (verify?.trigger_source !== "import") throw new Error("expected trigger_source import");
  if (verify?.duration_ms == null || verify.duration_ms < 0) throw new Error("expected duration_ms");

  await pg.end();
  console.log("\nverify-185a-pilot-import: PASS");
}

main().catch((err) => {
  console.error("\nverify-185a-pilot-import: FAIL", err.message);
  process.exit(1);
});
