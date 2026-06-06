/**
 * Shared league sync runtime — used by CLI, Vercel cron, and Platform Admin.
 * In-process only (no subprocess shell).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { fetchAllLeagueSources } from "./league-live-sources.mjs";
import { createPipelineClient, runLivePipeline } from "./league-live-pipeline.mjs";
import { fetchSquadAndStats } from "./league-squad-sources.mjs";
import { listLeagueSyncClubs, loadLeagueClubConfig } from "./league-club-config.mjs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

/** @typedef {'cron' | 'platform_admin'} LeagueSyncTriggerSource */

/**
 * @param {boolean | null | undefined} explicit
 * @returns {boolean}
 */
function shouldPersistFixtures(explicit) {
  if (explicit != null) return Boolean(explicit);
  return !process.env.VERCEL;
}

/**
 * @param {boolean} persist
 * @returns {string | null}
 */
function resolveFixtureOutDir(persist) {
  if (!persist) return null;
  if (process.env.VERCEL) {
    return join(tmpdir(), "fc-os-league-fixtures");
  }
  return join(repoRoot, "fixtures/league/live");
}

/**
 * @param {string | null} outDir
 * @param {string} slug
 * @param {unknown} fetched
 * @param {unknown} squadData
 * @param {{ fixtures: unknown[] }} merged
 */
function writeFixtureSnapshots(outDir, slug, fetched, squadData, merged) {
  if (!outDir) return;
  mkdirSync(outDir, { recursive: true });
  const clubOutDir = join(outDir, slug);
  mkdirSync(clubOutDir, { recursive: true });
  writeFileSync(join(clubOutDir, "source-meta.json"), JSON.stringify(fetched, null, 2) + "\n");
  writeFileSync(join(clubOutDir, "squad-stats.json"), JSON.stringify(squadData, null, 2) + "\n");
  writeFileSync(
    join(clubOutDir, "fixtures.json"),
    JSON.stringify({ matches: merged.fixtures }, null, 2) + "\n",
  );
}

function countProcessed(pipelineResult) {
  if (!pipelineResult) return 0;
  return (
    (pipelineResult.ingest?.processed ?? 0) +
    (pipelineResult.tableSynced ?? 0) +
    (pipelineResult.matchSync?.processed ?? 0) +
    (pipelineResult.squadSync?.processed ?? 0)
  );
}

function countFailed(pipelineResult) {
  if (!pipelineResult) return 0;
  return (
    (pipelineResult.ingest?.failed ?? 0) +
    (pipelineResult.matchSync?.failed ?? 0) +
    (pipelineResult.squadSync?.failed ?? 0)
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {{ clubId: string; slug: string; publicName: string }} clubSummary
 * @param {{
 *   dryRun?: boolean;
 *   triggerSource?: LeagueSyncTriggerSource;
 *   persistFixtures?: boolean | null;
 * }} opts
 */
async function syncOneClub(supabase, clubSummary, opts) {
  const clubConfig = await loadLeagueClubConfig(supabase, clubSummary.clubId);
  clubConfig.slug = clubSummary.slug;

  const [fetched, squadData] = await Promise.all([
    fetchAllLeagueSources(clubConfig),
    fetchSquadAndStats(clubConfig),
  ]);
  const { merged } = fetched;
  const ownRow = merged.ownTeamRow ?? merged.glksMietkow;

  const outDir = resolveFixtureOutDir(shouldPersistFixtures(opts.persistFixtures));
  writeFixtureSnapshots(outDir, clubSummary.slug, fetched, squadData, merged);

  if (opts.dryRun) {
    return {
      ok: true,
      dryRun: true,
      clubId: clubSummary.clubId,
      slug: clubSummary.slug,
      publicName: clubSummary.publicName,
      recordsProcessed: 0,
      recordsFailed: 0,
      jobId: null,
      durationMs: 0,
    };
  }

  const startedAt = Date.now();
  const pipelineResult = await runLivePipeline(
    merged,
    {
      fetchedAt: fetched.fetchedAt,
      tableSource: merged.tableSource,
      tableConflicts: merged.tableConflicts,
      ownTeamRow: ownRow,
      glksMietkow: ownRow,
    },
    squadData,
    clubConfig,
    { triggerSource: opts.triggerSource ?? "cron" },
  );

  return {
    ok: true,
    clubId: clubSummary.clubId,
    slug: clubSummary.slug,
    publicName: clubSummary.publicName,
    jobId: pipelineResult.jobId ?? null,
    recordsProcessed: countProcessed(pipelineResult),
    recordsFailed: countFailed(pipelineResult),
    durationMs: Date.now() - startedAt,
    pipeline: pipelineResult,
  };
}

/**
 * @param {{
 *   clubId?: string | null;
 *   dryRun?: boolean;
 *   triggerSource?: LeagueSyncTriggerSource;
 *   persistFixtures?: boolean | null;
 * }} [options]
 */
export async function runLeagueSync(options = {}) {
  const startedAt = Date.now();
  const supabase = createPipelineClient();
  let clubs = await listLeagueSyncClubs(supabase);

  if (options.clubId) {
    clubs = clubs.filter((c) => c.clubId === options.clubId);
    if (!clubs.length) {
      throw new Error(`Brak aktywnego klubu mirror live o id ${options.clubId}.`);
    }
  }

  if (!clubs.length) {
    return {
      ok: true,
      clubsTotal: 0,
      clubsSucceeded: 0,
      clubsFailed: 0,
      recordsProcessed: 0,
      recordsFailed: 0,
      durationMs: Date.now() - startedAt,
      jobIds: [],
      results: [],
    };
  }

  const results = [];
  for (const club of clubs) {
    try {
      const result = await syncOneClub(supabase, club, options);
      results.push(result);
    } catch (err) {
      results.push({
        ok: false,
        clubId: club.clubId,
        slug: club.slug,
        publicName: club.publicName,
        error: err instanceof Error ? err.message : String(err),
        recordsProcessed: 0,
        recordsFailed: 0,
        jobId: null,
        durationMs: 0,
      });
    }
  }

  const failed = results.filter((r) => !r.ok);
  const recordsProcessed = results.reduce((sum, r) => sum + (r.recordsProcessed ?? 0), 0);
  const recordsFailed = results.reduce((sum, r) => sum + (r.recordsFailed ?? 0), 0);
  const jobIds = results.map((r) => r.jobId).filter(Boolean);

  return {
    ok: failed.length === 0,
    clubsTotal: clubs.length,
    clubsSucceeded: results.filter((r) => r.ok).length,
    clubsFailed: failed.length,
    recordsProcessed,
    recordsFailed,
    durationMs: Date.now() - startedAt,
    jobIds,
    results,
  };
}
