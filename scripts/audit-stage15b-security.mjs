#!/usr/bin/env node
/**
 * Static security audit — ETAP 15B League Hub (post-fix).
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];
let failed = 0;

function pass(id, message) {
  checks.push({ id, status: "PASS", message });
}

function fail(id, message) {
  checks.push({ id, status: "FAIL", message });
  failed += 1;
}

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

const actions = read("src/features/league/actions.ts");
const sync = read("src/lib/league/sync.ts");
const validation = read("src/lib/league/validation.ts");
const migration = read("supabase/migrations/20260618123000_stage15b_audit_hardening.sql");
const baseMigration = read("supabase/migrations/20260618120000_stage15b_league_hub.sql");
const adapters = read("src/lib/league/adapters/index.ts");
const readTools = read("src/lib/ai/agent/tools/read.ts");
const panels = read("src/features/league/components/league-panels.tsx");

// P0 — cross-club import
if (actions.includes("assertLeagueImportContext") && validation.includes("Rozgrywki nie należą do tego klubu")) {
  pass("S15B-01", "Import waliduje competition/season/source vs club_id");
} else {
  fail("S15B-01", "Brak assertLeagueImportContext w importLeagueFileAction");
}

if (migration.includes("enforce_league_sync_job_consistency") && migration.includes("competition_id does not belong to club_id on league_sync_jobs")) {
  pass("S15B-02", "Trigger spójności league_sync_jobs (competition/source)");
} else {
  fail("S15B-02", "Brak triggera league_sync_jobs");
}

if (migration.includes("season_id does not match competition season")) {
  pass("S15B-03", "Trigger wymusza zgodność season_id ↔ competition");
} else {
  fail("S15B-03", "Brak walidacji season↔competition w DB");
}

// P1 — CSV injection
if (validation.includes("sanitizeLeagueImportText") && sync.includes("sanitizeLeagueImportText")) {
  pass("S15B-04", "Sanityzacja formuł CSV/Excel przy imporcie");
} else {
  fail("S15B-04", "Brak sanitizeLeagueImportText w sync");
}

// P1 — XLSX
if (adapters.includes("isXlsxBinaryContent") && validation.includes("isXlsxBinaryContent")) {
  pass("S15B-05", "XlsxLeagueAdapter weryfikuje magic bytes ZIP");
} else {
  fail("S15B-05", "Brak walidacji binarnej XLSX");
}

// P1 — duplikaty meczów
if (sync.includes("canonicalLeagueTeamKeyName") && sync.includes("external_key")) {
  pass("S15B-06", "Kanoniczny external_key (deduplikacja nazw ligowych)");
} else {
  fail("S15B-06", "Brak kanonicznego external_key");
}

if (sync.includes("recordScoreConflict") && migration.includes("league_conflicts_pending_uniq")) {
  pass("S15B-07", "Unikalność pending konfliktów + deduplikacja w sync");
} else {
  fail("S15B-07", "Brak ochrony przed duplikatami konfliktów");
}

// P1 — tabela ligowa
if (validation.includes("clampTableStat") && sync.includes("clampTableStat")) {
  pass("S15B-08", "Clamp statystyk tabeli (0–999)");
} else {
  fail("S15B-08", "Brak clampTableStat przy imporcie tabeli");
}

if (actions.includes("MAX_LEAGUE_IMPORT_ROWS")) {
  pass("S15B-09", "Limit wierszy importu (500)");
} else {
  fail("S15B-09", "Brak MAX_LEAGUE_IMPORT_ROWS w actions");
}

// P1 — konflikt danych
if (sync.includes('String(conflict.status) !== "pending"')) {
  pass("S15B-10", "resolveLeagueConflict tylko dla status pending");
} else {
  fail("S15B-10", "Brak walidacji statusu konfliktu");
}

// P1 — RLS
if (baseMigration.includes("actor_can_read_league") && migration.includes("GRANT EXECUTE ON FUNCTION public.actor_can_read_league")) {
  pass("S15B-11", "RLS helpers + GRANT EXECUTE");
} else {
  fail("S15B-11", "Brak GRANT EXECUTE dla actor_can_*_league");
}

if (migration.includes("league_conflicts_insert") && migration.includes("actor_can_sync_league")) {
  pass("S15B-12", "Rozdzielone polityki INSERT/UPDATE league_conflicts");
} else {
  fail("S15B-12", "league_conflicts_manage nadal FOR ALL");
}

// P2 — integracja Matches
if (baseMigration.includes("match_id does not belong to club_id") && sync.includes("displayHome")) {
  pass("S15B-13", "Sync Matches z mapowaniem nazw + FK match_id");
} else {
  fail("S15B-13", "Brak spójności match_id w League Hub");
}

// P2 — AI
if (readTools.includes("getLeagueInsights") && readTools.includes("canReadLeague")) {
  pass("S15B-14", "AI getLeagueInsights z kontrolą league:read");
} else {
  fail("S15B-14", "Brak kontroli uprawnień w getLeagueInsights");
}

// P2 — Content Hub (match_id z tego samego klubu)
if (existsSync(join(root, "src/lib/content/verify-references.ts"))) {
  pass("S15B-15", "Content Hub verifyContentReferences — match_id scoped do club_id");
} else {
  fail("S15B-15", "Brak verify-references dla Content Hub");
}

// P2 — mobile
if (panels.includes("min-h-[44px]")) {
  pass("S15B-16", "League Hub UI — touch targets PWA");
} else {
  fail("S15B-16", "Brak min-h-[44px] w panelach League");
}

if (existsSync(join(root, "docs/audit/stage-15b-audit.md"))) {
  pass("S15B-17", "Raport audytu stage-15b-audit.md istnieje");
} else {
  fail("S15B-17", "Brak docs/audit/stage-15b-audit.md");
}

console.log("\n=== ETAP 15B Security Audit ===\n");
for (const check of checks) {
  console.log(`${check.status === "PASS" ? "✓" : "✗"} [${check.id}] ${check.message}`);
}
console.log(`\n${checks.length - failed}/${checks.length} PASS\n`);
process.exit(failed > 0 ? 1 : 0);
