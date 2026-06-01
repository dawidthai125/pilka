#!/usr/bin/env node
/**
 * Static security audit — ETAP 15.7 Attendance & Availability 2.0
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

const migration = read("supabase/migrations/20260620120000_stage157_attendance_availability.sql");
const audit = read("supabase/migrations/20260620123000_stage157_audit_hardening.sql");
const actions = read("src/features/attendance/actions.ts");
const dispatch = read("src/lib/attendance/dispatch.ts");
const insights = read("src/lib/attendance/insights.ts");
const permissions = read("src/config/permissions.ts");

if (
  migration.includes("ENABLE ROW LEVEL SECURITY") &&
  migration.includes("actor_can_set_player_availability") &&
  migration.includes("actor_managed_player_ids")
) {
  pass("S157-01", "RLS + helper actor_can_set_player_availability / actor_managed_player_ids");
} else {
  fail("S157-01", "Brak RLS/helpers dostępności");
}

if (
  migration.includes("player_availability_enforce_team") ||
  audit.includes("enforce_player_availability_player_club")
) {
  pass("S157-02", "Trigger team scope dla player_availability");
} else {
  fail("S157-02", "Brak triggera team scope");
}

if (
  migration.includes("actor_can_respond_match_squad") &&
  migration.includes("match_squad_responses")
) {
  pass("S157-03", "Match squad responses + actor_can_respond_match_squad");
} else {
  fail("S157-03", "Brak RLS match squad responses");
}

if (
  migration.includes("sync_training_availability_to_player_availability") &&
  migration.includes("sync_training_attendance_to_records")
) {
  pass("S157-04", "Sync z training_availability / training_attendance");
} else {
  fail("S157-04", "Brak sync triggerów treningowych");
}

if (actions.includes("resolveOwnPlayerIds") && actions.includes("playerId")) {
  pass("S157-05", "Rodzic/zawodnik — scope playerId w actions");
} else {
  fail("S157-05", "Brak scope playerId dla rodzica");
}

if (dispatch.includes("match_squad_call")) {
  pass("S157-06", "Push powiadomień powołania meczowego");
} else {
  fail("S157-06", "Brak push match_squad_call");
}

if (
  insights.includes("recommend") ||
  (insights.includes("severity") && !insights.includes("auto"))
) {
  pass("S157-07", "AI insights — rekomendacje bez auto-decyzji");
} else {
  fail("S157-07", "Brak wzorca AI recommendations-only");
}

if (
  permissions.includes("attendance:read") &&
  permissions.includes("attendance:report") &&
  permissions.includes("canViewAttendanceReports")
) {
  pass("S157-08", "RBAC attendance:read / attendance:report");
} else {
  fail("S157-08", "Brak RBAC attendance");
}

if (audit.includes("enforce_match_squad_response_club")) {
  pass("S157-09", "Trigger club scope match_squad_responses");
} else {
  fail("S157-09", "Brak triggera match_squad_responses");
}

if (read("src/features/attendance/components/attendance-quick-actions.tsx").includes("quickAvailableAction")) {
  pass("S157-10", "PWA quick actions — jedno kliknięcie dostępności");
} else {
  fail("S157-10", "Brak PWA quick actions");
}

console.log("\nETAP 15.7 Attendance — static security audit\n");
for (const c of checks) {
  console.log(`[${c.status}] ${c.id}: ${c.message}`);
}
const passed = checks.filter((c) => c.status === "PASS").length;
console.log(`\n${passed}/${checks.length} PASS`);
if (failed) process.exit(1);
