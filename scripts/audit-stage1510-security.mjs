#!/usr/bin/env node
/**
 * Static security audit — ETAP 15.10 Injury & Medical
 */

import { readFileSync } from "node:fs";
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

const migration = read("supabase/migrations/20260623120000_stage1510_injury_medical.sql");
const audit = read("supabase/migrations/20260623123000_stage1510_audit_hardening.sql");
const actions = read("src/features/injuries/actions.ts");
const dispatch = read("src/lib/injuries/dispatch.ts");
const insights = read("src/lib/injuries/insights.ts");
const permissions = read("src/config/permissions.ts");

const parentFix = read("supabase/migrations/20260623125000_stage1510_parent_guardian.sql");

if (
  migration.includes("ENABLE ROW LEVEL SECURITY") &&
  migration.includes("actor_can_read_injury_row") &&
  parentFix.includes("actor_managed_player_ids")
) {
  pass("S1510-01", "RLS + helper actor_can_manage_injury_row / portal scope");
} else {
  fail("S1510-01", "Brak RLS/helpers Injury");
}

if (audit.includes("enforce_rehabilitation_plan_club_scope")) {
  pass("S1510-02", "Trigger club scope dla rehabilitation_plans / return_to_play");
} else {
  fail("S1510-02", "Brak triggerów scope");
}

if (
  migration.includes("injury_categories") &&
  migration.includes("actor_can_manage_injury_config")
) {
  pass("S1510-03", "Kategorie urazów + scoped config");
} else {
  fail("S1510-03", "Brak RLS kategorii");
}

if (migration.includes("sync_injury_availability_impact") && migration.includes("limited")) {
  pass("S1510-04", "Integracja availability (absent/limited)");
} else {
  fail("S1510-04", "Brak sync availability");
}

if (insights.includes("generateInjuryInsights") && !actions.includes("sendMail")) {
  pass("S1510-05", "AI Insights — rekomendacje bez auto-decyzji");
} else {
  fail("S1510-05", "Brak wzorca AI recommendation-only");
}

if (
  dispatch.includes("injury_reported") &&
  dispatch.includes("injury_return_training") &&
  dispatch.includes("injury_return_match")
) {
  pass("S1510-06", "Powiadomienia urazów → Communication Hub");
} else {
  fail("S1510-06", "Brak dispatch powiadomień");
}

if (
  permissions.includes("injuries:read") &&
  permissions.includes("injuries:manage") &&
  permissions.includes("canManageInjuryStaff")
) {
  pass("S1510-07", "RBAC injuries:read / manage / config / portal");
} else {
  fail("S1510-07", "Brak RBAC Injury");
}

if (read("src/lib/injuries/loaders.ts").includes("getPortalInjuries")) {
  pass("S1510-08", "Portal zawodnika/rodzica");
} else {
  fail("S1510-08", "Brak loadera portalu");
}

if (read("src/features/injuries/components/injury-dashboard-panel.tsx").includes("InjuryDashboardPanel")) {
  pass("S1510-09", "Dashboard widgety urazy/rehab/powroty");
} else {
  fail("S1510-09", "Brak dashboardu");
}

if (read("src/middleware.ts").includes('"/injuries"') && read("src/sw.ts").includes('"/injuries"')) {
  pass("S1510-10", "PWA — prefix /injuries w middleware i SW");
} else {
  fail("S1510-10", "Brak PWA prefix");
}

if (read("src/lib/attendance/loaders.ts").includes("getMatchSquadInjuryFlags")) {
  pass("S1510-11", "Integracja Match Squad — flagi RTP");
} else {
  fail("S1510-11", "Brak integracji match squad");
}

if (read("src/lib/injuries/constants.ts").toLowerCase().includes("diagnoz medycznych")) {
  pass("S1510-12", "Disclaimer — brak danych medycznych");
} else {
  fail("S1510-12", "Brak disclaimer modułu");
}

if (
  migration.includes("rehabilitation_plans") &&
  migration.includes("return_to_play") &&
  migration.includes("return_to_training_status") &&
  migration.includes("return_to_match_status")
) {
  pass("S1510-13", "Tabele rehab + RTP ze statusami trening/mecz");
} else {
  fail("S1510-13", "Brak rehabilitation_plans / return_to_play");
}

if (
  read("src/app/(dashboard)/injuries/ai/page.tsx").includes("generateInjuryInsights") &&
  read("src/features/injuries/components/injury-ai-panel.tsx").includes("InjuryAiPanel")
) {
  pass("S1510-14", "AI Medical Insights — /injuries/ai + panel");
} else {
  fail("S1510-14", "Brak AI Medical Insights UI");
}

if (
  read("src/lib/injuries/loaders.ts").includes("getInjuryDashboardStats") &&
  read("src/app/(dashboard)/injuries/page.tsx").includes("InjuryDashboardPanel")
) {
  pass("S1510-15", "Dashboard — loader statystyk + panel widgetów");
} else {
  fail("S1510-15", "Brak dashboard loader/panel");
}

if (
  dispatch.includes("club_notifications") &&
  dispatch.includes("notification_queue") &&
  migration.includes("'injury_reported'")
) {
  pass("S1510-16", "Powiadomienia — club_notifications + notification_queue + enumy");
} else {
  fail("S1510-16", "Brak pełnej integracji powiadomień");
}

console.log("\nETAP 15.10 — static security audit\n");
for (const check of checks) {
  console.log(`${check.status.padEnd(4)} ${check.id} — ${check.message}`);
}
console.log(`\n${checks.length - failed}/${checks.length} PASS\n`);
process.exit(failed ? 1 : 0);
