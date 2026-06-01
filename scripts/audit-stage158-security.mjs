#!/usr/bin/env node
/**
 * Static security audit — ETAP 15.8 Club CRM
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

const migration = read("supabase/migrations/20260621120000_stage158_club_crm.sql");
const audit = read("supabase/migrations/20260621123000_stage158_audit_hardening.sql");
const actions = read("src/features/crm/actions.ts");
const dispatch = read("src/lib/crm/dispatch.ts");
const generator = read("src/lib/crm/generator.ts");
const permissions = read("src/config/permissions.ts");

if (
  migration.includes("ENABLE ROW LEVEL SECURITY") &&
  migration.includes("actor_can_manage_crm") &&
  migration.includes("actor_crm_portal_contact_ids")
) {
  pass("S158-01", "RLS + helper actor_can_manage_crm / portal scope");
} else {
  fail("S158-01", "Brak RLS/helpers CRM");
}

if (audit.includes("enforce_crm_contact_player_club")) {
  pass("S158-02", "Trigger club/player scope dla crm_contacts");
} else {
  fail("S158-02", "Brak triggera crm_contacts");
}

if (migration.includes("crm_interactions") && migration.includes("actor_can_access_crm_contact")) {
  pass("S158-03", "Historia relacji + scoped SELECT");
} else {
  fail("S158-03", "Brak RLS crm_interactions");
}

if (actions.includes("syncFinance") && actions.includes("finance_income")) {
  pass("S158-04", "Integracja darowizn z Finance");
} else {
  fail("S158-04", "Brak sync CRM → finance_income");
}

if (generator.includes("generateCrmDraft") && !actions.includes("sendMail")) {
  pass("S158-05", "AI CRM — szkice bez auto-wysyłki");
} else {
  fail("S158-05", "Brak wzorca AI draft-only");
}

if (dispatch.includes("crm_task_reminder")) {
  pass("S158-06", "Powiadomienia zadań CRM");
} else {
  fail("S158-06", "Brak push crm_task_reminder");
}

if (
  permissions.includes("crm:read") &&
  permissions.includes("crm:manage") &&
  permissions.includes("canManageCrm")
) {
  pass("S158-07", "RBAC crm:read / crm:manage / crm:portal");
} else {
  fail("S158-07", "Brak RBAC CRM");
}

if (read("src/lib/crm/loaders.ts").includes("getCrmParentContext")) {
  pass("S158-08", "Integracja rodziców z 15.6/15.7");
} else {
  fail("S158-08", "Brak loadera rodziców");
}

if (migration.includes("crm_pipeline_status") && read("src/features/crm/components/crm-pipeline-board.tsx").includes("CrmPipelineBoard")) {
  pass("S158-09", "Sponsor Pipeline Kanban");
} else {
  fail("S158-09", "Brak widoku Kanban");
}

if (read("src/middleware.ts").includes('"/crm"') && read("src/sw.ts").includes('"/crm"')) {
  pass("S158-10", "PWA — prefix /crm w middleware i SW");
} else {
  fail("S158-10", "Brak rejestracji PWA /crm");
}

const coachEventsScope =
  migration.includes("user_has_club_role(club_id, ARRAY['coach']") &&
  migration.includes("'parent_meeting', 'other')");
if (coachEventsScope) {
  pass("S158-11", "RLS — trener bez dostępu do sponsor_meeting");
} else {
  fail("S158-11", "Brak scoped events dla trenera");
}

if (read("supabase/migrations/20260621125000_seed_stage158_parent_portal.sql").includes("rodzic@piorun.test")) {
  pass("S158-12", "Seed portal rodzica (profile_id)");
} else {
  fail("S158-12", "Brak seed rodzica CRM");
}

console.log("\nETAP 15.8 Club CRM — static security audit\n");
for (const c of checks) {
  console.log(`[${c.status}] ${c.id}: ${c.message}`);
}
const passed = checks.filter((c) => c.status === "PASS").length;
console.log(`\n${passed}/${checks.length} PASS`);
if (failed) process.exit(1);
