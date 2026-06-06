#!/usr/bin/env node
/**
 * Static consolidation audit — ETAP 15.5 Football Club OS.
 * Exit 0 = pass, 1 = failures found.
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

function fileExists(relPath) {
  return existsSync(join(root, relPath));
}

const strings = read("src/lib/strings.ts");
const formData = read("src/lib/form-data.ts");
const rowHelpers = read("src/lib/mappers/row-helpers.ts");
const statsGrid = read("src/components/ui/stats-grid.tsx");
const middleware = read("src/middleware.ts");
const sw = read("src/sw.ts");
const eslint = read("eslint.config.mjs");
const financeActions = read("src/features/finance/actions.ts");

// Shared utilities
if (strings.includes("slugifyTitle") && read("src/lib/content/mappers.ts").includes("slugifyContentTitle = slugifyTitle")) {
  pass("S155-01", "Ujednolicony slugifyTitle (content + website)");
} else {
  fail("S155-01", "Brak wspólnego slugifyTitle");
}

if (formData.includes("readString") && financeActions.includes('from "@/lib/form-data"')) {
  pass("S155-02", "Wspólny readString w server actions");
} else {
  fail("S155-02", "Brak lib/form-data.ts w actions");
}

if (rowHelpers.includes("mapStr") && read("src/lib/inventory/mappers.ts").includes("@/lib/mappers/row-helpers")) {
  pass("S155-03", "Wspólne row-helpers w mapperach");
} else {
  fail("S155-03", "Brak lib/mappers/row-helpers");
}

if (statsGrid.includes("StatsGrid") && read("src/features/finance/components/finance-dashboard-stats.tsx").includes("StatsGrid")) {
  pass("S155-04", "Ujednolicony StatsGrid dla dashboardów");
} else {
  fail("S155-04", "Brak StatsGrid");
}

// Dead code removed
if (!fileExists("src/lib/pwa/notification-queue.ts")) {
  pass("S155-05", "Usunięty martwy notification-queue");
} else {
  fail("S155-05", "notification-queue.ts nadal istnieje");
}

if (!fileExists("src/features/training/components/notifications-center.tsx")) {
  pass("S155-06", "Usunięty zastąpiony NotificationsCenter (training)");
} else {
  fail("S155-06", "Stary NotificationsCenter nadal istnieje");
}

if (!read("src/lib/website/insights.ts").includes("buildWebsiteAiContext")) {
  pass("S155-07", "Usunięty nieużywany buildWebsiteAiContext");
} else {
  fail("S155-07", "buildWebsiteAiContext nadal eksportowany");
}

// Route / PWA alignment
if (middleware.includes('"/settings"') && middleware.includes('"/video"') && middleware.includes('"/content"')) {
  pass("S155-08", "Middleware chroni /settings, /video, /content");
} else {
  fail("S155-08", "Middleware — brak spójności prefixów");
}

if (sw.includes('"/video"') && sw.includes('"/content"')) {
  pass("S155-09", "Service Worker — /video i /content w PROTECTED_PREFIXES");
} else {
  fail("S155-09", "SW — brak /video lub /content");
}

if (eslint.includes("public/sw.js")) {
  pass("S155-10", "ESLint ignoruje wygenerowany public/sw.js");
} else {
  fail("S155-10", "ESLint nadal skanuje public/sw.js");
}

if (fileExists("docs/archive/audit/stage-15.5-consolidation-audit.md")) {
  pass("S155-11", "Raport konsolidacji stage-15.5 istnieje");
} else {
  fail("S155-11", "Brak docs/archive/audit/stage-15.5-consolidation-audit.md");
}

console.log("\n=== ETAP 15.5 Consolidation Audit ===\n");
for (const check of checks) {
  const icon = check.status === "PASS" ? "✓" : "✗";
  console.log(`${icon} [${check.id}] ${check.message}`);
}
console.log(`\n${checks.length - failed}/${checks.length} PASS\n`);

process.exit(failed > 0 ? 1 : 0);
