#!/usr/bin/env node
/**
 * Static security audit — ETAP 15.9 Equipment & Assets
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

const migration = read("supabase/migrations/20260622120000_stage159_equipment_assets.sql");
const audit = read("supabase/migrations/20260622123000_stage159_audit_hardening.sql");
const actions = read("src/features/equipment/actions.ts");
const dispatch = read("src/lib/equipment/dispatch.ts");
const generator = read("src/lib/equipment/generator.ts");
const permissions = read("src/config/permissions.ts");

if (
  migration.includes("ENABLE ROW LEVEL SECURITY") &&
  migration.includes("actor_can_manage_equipment") &&
  migration.includes("actor_managed_player_ids")
) {
  pass("S159-01", "RLS + helper actor_can_manage_equipment / portal scope");
} else {
  fail("S159-01", "Brak RLS/helpers Equipment");
}

if (audit.includes("enforce_asset_assignment_club_scope")) {
  pass("S159-02", "Trigger club scope dla asset_assignments");
} else {
  fail("S159-02", "Brak triggera scope");
}

if (
  migration.includes("asset_assignments") &&
  migration.includes("actor_can_issue_equipment")
) {
  pass("S159-03", "Wydania sprzętu + scoped issue");
} else {
  fail("S159-03", "Brak RLS wydań");
}

if (migration.includes("equipment_kits") && audit.includes("log_equipment_kit_change")) {
  pass("S159-04", "Stroje + historia zmian");
} else {
  fail("S159-04", "Brak equipment_kits / history");
}

if (generator.includes("generateEquipmentDraft") && !actions.includes("sendMail")) {
  pass("S159-05", "AI Assets — szkice bez auto-wysyłki");
} else {
  fail("S159-05", "Brak wzorca AI draft-only");
}

if (dispatch.includes("asset_return_overdue") && dispatch.includes("asset_damaged")) {
  pass("S159-06", "Powiadomienia sprzętu → Communication Hub");
} else {
  fail("S159-06", "Brak dispatch powiadomień");
}

if (
  permissions.includes("equipment:read") &&
  permissions.includes("equipment:manage") &&
  permissions.includes("canManageEquipment")
) {
  pass("S159-07", "RBAC equipment:read / manage / issue / portal");
} else {
  fail("S159-07", "Brak RBAC Equipment");
}

if (read("src/lib/equipment/loaders.ts").includes("getPortalEquipment")) {
  pass("S159-08", "Portal zawodnika/rodzica");
} else {
  fail("S159-08", "Brak loadera portalu");
}

if (read("src/features/equipment/components/equipment-warehouse-panel.tsx").includes("EquipmentWarehousePanel")) {
  pass("S159-09", "Magazyn z filtrami kategoria/stan/lokalizacja");
} else {
  fail("S159-09", "Brak widoku magazynu");
}

if (read("src/middleware.ts").includes('"/equipment"') && read("src/sw.ts").includes('"/equipment"')) {
  pass("S159-10", "PWA — prefix /equipment w middleware i SW");
} else {
  fail("S159-10", "Brak rejestracji PWA /equipment");
}

if (read("src/features/equipment/components/equipment-quick-actions.tsx").includes("Wydaj sprzęt")) {
  pass("S159-11", "PWA quick actions — wydaj/zwrot/uszkodzenie");
} else {
  fail("S159-11", "Brak quick actions");
}

if (migration.includes("asset_categories") && migration.includes("asset_maintenance")) {
  pass("S159-12", "5 tabel specyfikacji + equipment_kit_history");
} else {
  fail("S159-12", "Brak tabel DB");
}

if (read("src/features/equipment/components/equipment-dashboard-panel.tsx").includes("EquipmentDashboardPanel")) {
  pass("S159-13", "Dashboard — 4 widgety majątku");
} else {
  fail("S159-13", "Brak dashboardu Equipment");
}

if (
  read("src/lib/equipment/insights.ts").includes("generateEquipmentInsights") &&
  read("src/features/equipment/components/equipment-ai-panel.tsx").includes("EquipmentAiPanel")
) {
  pass("S159-14", "AI Asset Assistant — insights + panel");
} else {
  fail("S159-14", "Brak AI Asset Assistant");
}

if (read("supabase/migrations/20260622127000_stage159_ensure_player_guardians.sql").includes("player_guardians")) {
  pass("S159-15", "Seed powiązania rodzic–zawodnik (player_guardians)");
} else {
  fail("S159-15", "Brak seed rodzica");
}

console.log("\nETAP 15.9 Equipment & Assets — static security audit\n");
for (const c of checks) {
  console.log(`[${c.status}] ${c.id}: ${c.message}`);
}
const passed = checks.filter((c) => c.status === "PASS").length;
console.log(`\n${passed}/${checks.length} PASS`);
if (failed) process.exit(1);
