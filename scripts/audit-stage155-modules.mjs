#!/usr/bin/env node
/**
 * ETAP 15.5 post-consolidation audit — module integrity + no regressions.
 * Exit 0 = pass, 1 = failures found.
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
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

function walkTsFiles(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, out);
    else if ([".ts", ".tsx"].includes(extname(entry))) out.push(full);
  }
  return out;
}

function projectContains(substring) {
  const dirs = [join(root, "src/features"), join(root, "src/app"), join(root, "src/lib")];
  for (const dir of dirs) {
    for (const file of walkTsFiles(dir)) {
      if (readFileSync(file, "utf8").includes(substring)) return true;
    }
  }
  return false;
}

const deletedFragments = [
  ["notification-queue", "S155A-01"],
  ["training/components/notifications-center", "S155A-02"],
  ["matches/components/integrations-panel", "S155A-03"],
  ["buildWebsiteAiContext", "S155A-04"],
  ["buildScoutingAiContext", "S155A-05"],
  ["buildIntegrationsSyncReport", "S155A-06"],
];

for (const [fragment, id] of deletedFragments) {
  if (!projectContains(fragment)) {
    pass(id, `Brak referencji do usuniętego kodu: ${fragment}`);
  } else {
    fail(id, `Nadal referencja do: ${fragment}`);
  }
}

const moduleRoutes = [
  ["Dashboard", "src/app/(dashboard)/dashboard/page.tsx", "getDashboardContext"],
  ["Mecze", "src/app/(dashboard)/matches/page.tsx", "getMatches"],
  ["Treningi", "src/app/(dashboard)/training/page.tsx", "getTrainings"],
  ["Sponsorzy", "src/app/(dashboard)/sponsors/page.tsx", "getSponsors"],
  ["Finanse", "src/app/(dashboard)/finance/page.tsx", "getFinanceDashboardStats"],
  ["AI-Assistant", "src/app/(dashboard)/ai/page.tsx", "requireAiReadAccess"],
  ["AI-Manager", "src/app/(dashboard)/ai/manager/page.tsx", "getAiManagerSnapshot"],
  ["Video-Center", "src/app/(dashboard)/video/page.tsx", "getVideoDashboardStats"],
  ["Content-Hub", "src/app/(dashboard)/content/page.tsx", "getContentDashboardStats"],
  ["Public-Site", "src/app/(public)/page.tsx", "loadClubHomepageData"],
];

for (const [name, route, marker] of moduleRoutes) {
  const id = `S155A-M-${name}`;
  if (!fileExists(route)) {
    fail(id, `Brak trasy: ${route}`);
    continue;
  }
  if (read(route).includes(marker)) {
    pass(id, `${name.replace(/-/g, " ")} — trasa + loader OK`);
  } else {
    fail(id, `${name} — brak ${marker}`);
  }
}

const actionChecks = [
  ["publishContentPostAction", "src/features/content/actions.ts"],
  ["initVideoUploadAction", "src/features/video/actions.ts"],
  ["executeAgentCommand", "src/features/ai-manager/actions.ts"],
  ["generateContentWithAiAction", "src/features/content/actions.ts"],
  ["createFinanceIncome", "src/features/finance/actions.ts"],
  ["createSponsor", "src/features/sponsors/actions.ts"],
  ["sendAiMessage", "src/features/ai/actions.ts"],
  ["NotificationsCenterEnhanced", "src/features/pwa/components/notifications-center-enhanced.tsx"],
  ["parsePlayerPosition", "src/lib/validators.ts"],
  ["buildWebsiteAiNewsDraft", "src/lib/website/insights.ts"],
];

for (const [symbol, file] of actionChecks) {
  const id = `S155A-A-${symbol}`;
  if (fileExists(file) && read(file).includes(symbol)) {
    pass(id, `Zachowane: ${symbol}`);
  } else {
    fail(id, `Brak: ${symbol}`);
  }
}

if (read("src/lib/academy/mappers.ts").includes("mapNullableStr as optStr")) {
  pass("S155A-U-01", "Academy mapper — mapNullableStr (bez regresji)");
} else {
  fail("S155A-U-01", "Academy mapper — błędny helper");
}

if (read("src/components/ui/stats-grid.tsx").includes("export function StatsGrid")) {
  pass("S155A-U-02", "StatsGrid — komponent współdzielony");
} else {
  fail("S155A-U-02", "Brak StatsGrid");
}

if (fileExists("docs/archive/audit/stage-15.5-audit.md")) {
  pass("S155A-R-01", "Raport audytu stage-15.5-audit.md");
} else {
  fail("S155A-R-01", "Brak raportu audytu");
}

console.log("\n=== ETAP 15.5 Module Audit ===\n");
for (const check of checks) {
  const icon = check.status === "PASS" ? "✓" : "✗";
  console.log(`${icon} [${check.id}] ${check.message}`);
}
console.log(`\n${checks.length - failed}/${checks.length} PASS\n`);

process.exit(failed > 0 ? 1 : 0);
