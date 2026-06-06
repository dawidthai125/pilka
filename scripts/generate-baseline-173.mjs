#!/usr/bin/env node
/**
 * Sprint 17.5b — generate supabase/baseline.sql (repaired ordering + strip rules).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = join(root, "supabase/migrations");
const outPath = join(root, "supabase/baseline.sql");
const classificationPath = join(root, "docs/archive/17x-infrastructure/sprint-173-migration-classification.json");

const PIORUN_UUID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

const EXCLUDE_FROM_BASELINE = new Set([
  "20260531130000_seed_first_club.sql",
  "20260531162000_seed_players.sql",
  "20260531171000_seed_trainings.sql",
  "20260531181000_seed_matches.sql",
  "20260531191000_seed_ai.sql",
  "20260531201000_seed_sponsors.sql",
  "20260601101000_seed_finance.sql",
  "20260602101000_seed_inventory.sql",
  "20260603101000_seed_website.sql",
  "20260604101000_seed_integrations.sql",
  "20260605101000_seed_academy.sql",
  "20260605111100_seed_website_demo_media.sql",
  "20260615121000_seed_stage13_ai_manager.sql",
  "20260616121000_seed_stage14_video.sql",
  "20260617121000_seed_stage15a_content.sql",
  "20260618121000_seed_stage15b_league.sql",
  "20260619121000_seed_stage156_communication.sql",
  "20260620121000_seed_stage157_attendance.sql",
  "20260621121000_seed_stage158_club_crm.sql",
  "20260621125000_seed_stage158_parent_portal.sql",
  "20260622121000_seed_stage159_equipment.sql",
  "20260622125000_seed_stage159_player_link.sql",
  "20260622126000_seed_stage159_parent_guardian.sql",
  "20260623121000_seed_stage1510_injury.sql",
  "20260602120000_league_mirror_live_source.sql",
  "20260605111200_website_40_copy.sql",
  "20260605111300_piorun_facebook_content.sql",
  "20260631120000_piorun_p1_real_content.sql",
  "20260631140000_piorun_media_quality_hotfix.sql",
  "20260631150000_piorun_contact_mockup.sql",
  "20260631160000_piorun_logo_cover_mockup.sql",
  "20260631170000_piorun_mockup_visual_assets.sql",
  "20260631180000_piorun_logo_crest_upgrade.sql",
  "20260618125000_league_table_entries_cleanup.sql",
  "20260619125000_stage156_team_ids_fix.sql",
  "20260622127000_stage159_ensure_player_guardians.sql",
]);

/** Superseded RPC/schema — final version applied later in baseline order. */
const EXCLUDE_SUPERSEDED = new Set([
  "20260602140000_public_players_league_stats.sql",
]);

/**
 * Must run AFTER league hub (creates league_player_registry).
 * Inserted after stage15b_trigger_fix.
 */
const DEFER_AFTER_LEAGUE_HUB = [
  "20260631200000_public_players_stats_fix.sql",
  "20260703120000_league_player_matching_161.sql",
];

const LEAGUE_HUB_ANCHOR = "20260618124000_stage15b_trigger_fix.sql";

function classify(file, sql) {
  const lower = sql.toLowerCase();
  const cats = new Set();
  if (/seed_|_seed\.sql|seed_stage/.test(file) || file.includes("seed_")) cats.add("D");
  if (/piorun|facebook_content|website_40_copy|league_mirror_live_source/.test(file)) cats.add("E");
  if (
    /cleanup|team_ids_fix|ensure_player_guardians/.test(file) &&
    !/audit|hardening|rls|trigger_fix|sync_fix|treasurer_fix|academy_fix/.test(file)
  ) {
    cats.add("F");
  }
  if (/audit_fixes|trigger_fix|sync_fix|treasurer_fix|last_result_date_fix|stats_fix|academy_fix|_rls_fix/.test(file)) {
    cats.add("C");
    if (/policy|rls|row level/.test(lower)) cats.add("B");
  }
  if (/audit|hardening|security|production_hardening|rls_fix/.test(file)) {
    cats.add("B");
    cats.add("C");
  }
  if (/create table|alter table|create type|create index|create extension|create unique/.test(lower)) cats.add("A");
  if (/enable row level security|create policy|alter policy|drop policy/.test(lower)) cats.add("B");
  if (/create or replace function|create function|create trigger|execute function/.test(lower)) cats.add("C");
  if (/insert into storage\.buckets/.test(lower)) cats.add("A");
  if (cats.size === 0) cats.add("A");
  return [...cats].sort().map((c) => {
    const map = { A: "CORE_SCHEMA", B: "RLS_SECURITY", C: "FUNCTIONS_RPC", D: "SEED_DATA", E: "CLUB_SPECIFIC", F: "HISTORICAL_FIX" };
    return map[c];
  });
}

function orderBaselineSources(files) {
  const available = new Set(files);
  for (const ex of EXCLUDE_SUPERSEDED) available.delete(ex);

  const deferred = DEFER_AFTER_LEAGUE_HUB.filter((f) => available.has(f));
  for (const d of deferred) available.delete(d);

  const main = [...available].sort();
  const anchorIdx = main.indexOf(LEAGUE_HUB_ANCHOR);
  const insertAt = anchorIdx >= 0 ? anchorIdx + 1 : main.findIndex((f) => f > LEAGUE_HUB_ANCHOR);
  if (insertAt < 0) return [...main, ...deferred];
  return [...main.slice(0, insertAt), ...deferred, ...main.slice(insertAt)];
}

function stripClubData(sql) {
  let out = sql.replace(
    /DO \$\$[\s\S]*?v_club_id UUID := 'a1b2c3d4[\s\S]*?END \$\$;\s*/gi,
    "-- [stripped: club-specific DO block]\n",
  );
  const lines = out.split("\n");
  const kept = [];
  let skip = false;
  let skipReason = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!skip && /^SELECT\b/i.test(trimmed)) {
      let j = i;
      let buf = "";
      while (j < lines.length) {
        buf += lines[j] + "\n";
        if (lines[j].trim().endsWith(";")) break;
        j++;
      }
      if (buf.includes(PIORUN_UUID) || /FROM public\.inventory_items\s*\n\s*(-- \[stripped|$)/i.test(buf)) {
        kept.push("-- [stripped: club-specific or incomplete SELECT]");
        i = j;
        continue;
      }
    }

    if (!skip && /^INSERT INTO public\./i.test(trimmed) && !/^INSERT INTO storage\./i.test(trimmed)) {
      if (/INSERT INTO public\.ai_report_categories/i.test(trimmed)) {
        skip = true;
        skipReason = "ai_report_categories catalog seed";
      } else if (trimmed.includes(PIORUN_UUID) || /club_id/i.test(trimmed)) {
        skip = true;
        skipReason = "club INSERT";
      } else if (!trimmed.endsWith(";")) {
        skip = true;
        skipReason = "public INSERT block";
      }
    }

    if (!skip && /^UPDATE public\./i.test(trimmed)) {
      skip = true;
      skipReason = "UPDATE";
    }

    if (!skip && /^DELETE FROM public\./i.test(trimmed)) {
      skip = true;
      skipReason = "DELETE";
    }

    if (!skip && trimmed.includes(PIORUN_UUID)) {
      skip = true;
      skipReason = "Piorun club reference";
    }

    if (skip) {
      if (trimmed.endsWith(";")) {
        kept.push(`-- [stripped: ${skipReason}]`);
        skip = false;
        skipReason = "";
      }
      continue;
    }

    kept.push(line);
  }

  return kept.join("\n");
}

function main() {
  const allFiles = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();
  const classification = [];
  const rawBaseline = allFiles.filter((f) => !EXCLUDE_FROM_BASELINE.has(f));
  const baselineSources = orderBaselineSources(rawBaseline);

  for (const file of allFiles) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    classification.push({
      migration: file,
      version: file.replace(/_.*$/, ""),
      categories: classify(file, sql),
      inBaseline: baselineSources.includes(file),
      primary: classify(file, sql)[0],
      deferred: DEFER_AFTER_LEAGUE_HUB.includes(file),
      superseded: EXCLUDE_SUPERSEDED.has(file),
    });
  }

  mkdirSync(join(root, "docs/architecture"), { recursive: true });

  const header = `-- FC OS Database Baseline
-- Sprint 17.5b — consolidated target schema (repaired ordering)
-- Generated: ${new Date().toISOString().slice(0, 10)}
--
-- Repairs: league_player_registry order, ai_report_categories seed strip, superseded RPC excluded
-- Source migrations: ${baselineSources.length} of ${allFiles.length} historical files
-- Apply on empty Supabase project BEFORE bootstrap-club.mjs
--
-- DO NOT apply to existing production without migration strategy.

`;

  const sections = baselineSources.map((file) => {
    const raw = readFileSync(join(migrationsDir, file), "utf8");
    const cleaned = stripClubData(raw);
    return `
-- =============================================================================
-- Source: ${file}
-- =============================================================================

${cleaned.trim()}

`;
  });

  const footer = `
-- End of FC OS baseline (${baselineSources.length} source migrations, Sprint 17.5b)
`;

  writeFileSync(outPath, header + sections.join("\n") + footer, "utf8");
  writeFileSync(
    classificationPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sprint: "17.5b",
        totalMigrations: allFiles.length,
        baselineSourceCount: baselineSources.length,
        excludedCount: allFiles.length - baselineSources.length,
        baselineSources,
        deferredAfterLeagueHub: DEFER_AFTER_LEAGUE_HUB.filter((f) => baselineSources.includes(f)),
        excludedSuperseded: [...EXCLUDE_SUPERSEDED],
        excluded: [...EXCLUDE_FROM_BASELINE].sort(),
        rows: classification,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log(`baseline.sql written (${baselineSources.length} sources, ${DEFER_AFTER_LEAGUE_HUB.length} deferred)`);
}

main();
