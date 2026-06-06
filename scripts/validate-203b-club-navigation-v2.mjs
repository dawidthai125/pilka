#!/usr/bin/env node
/**
 * Sprint 20.3B — Club Navigation v2 validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testNavigationConfig() {
  const nav = readFileSync(join(root, "src/config/navigation.ts"), "utf8");
  const dashNav = readFileSync(join(root, "src/components/layout/dashboard-nav.tsx"), "utf8");

  assert(nav.includes("dashboardNavSections"), "grouped sections export");
  assert(nav.includes('label: "Sport"'), "SPORT section");
  assert(nav.includes('label: "Rozgrywki"'), "ROZGRYWKI section");
  assert(nav.includes('label: "Klub"'), "KLUB section");
  assert(nav.includes('label: "Narzędzia"'), "NARZĘDZIA section");
  assert(nav.includes('label: "Administracja"'), "ADMINISTRACJA section");
  assert(nav.includes("defaultCollapsed: true"), "admin collapsed by default");

  assert(nav.includes('title: "Kadra"'), "Kadra rename");
  assert(nav.includes('title: "CRM"'), "CRM rename");
  assert(nav.includes('title: "Sprzęt"'), "Sprzęt rename");
  assert(nav.includes('title: "Asystent AI"'), "AI hub label");
  assert(nav.includes('title: "Mój magazyn"'), "inventory portal label");
  assert(nav.includes('href: "/inventory/portal"'), "inventory portal href unchanged");

  assert(!nav.includes("AI Club Manager"), "removed AI manager sidebar entry");
  assert(!nav.includes("Zadania AI"), "removed AI tasks sidebar entry");
  assert(!nav.includes("Club AI Assistant"), "removed duplicate AI assistant entry");
  assert(!nav.includes("Club CRM"), "removed Club CRM label");
  assert(!nav.includes("Equipment & Assets"), "removed EN equipment label");
  assert(!nav.includes("Zawodnicy"), "removed Zawodnicy sidebar label");
  assert(!nav.includes("Profil użytkownika"), "profile removed from sidebar");
  assert(!nav.includes('title: "Role i uprawnienia"'), "Role rename");

  assert(dashNav.includes("dashboardNavSections"), "dashboard nav uses sections");
  assert(dashNav.includes("filterDashboardNavForRoles"), "RBAC filter extracted");
  assert(dashNav.includes("defaultCollapsed"), "collapsible admin support");

  const inventoryPortal = readFileSync(
    join(root, "src/app/(dashboard)/inventory/portal/page.tsx"),
    "utf8",
  );
  assert(inventoryPortal.includes("Mój magazyn"), "inventory portal page title");

  const aiLayout = readFileSync(join(root, "src/app/(dashboard)/ai/layout.tsx"), "utf8");
  assert(aiLayout.includes("AiSubNav"), "AI sub-nav layout");

  console.log("OK navigation config & labels");
}

async function testRbacRuntime() {
  const { spawnSync } = await import("node:child_process");
  const tsxScript = join(root, "scripts/validate-203b-rbac-runtime.ts");
  const result = spawnSync("npx", ["--yes", "tsx", tsxScript], {
    cwd: root,
    encoding: "utf8",
    shell: true,
  });
  if (result.status !== 0) {
    throw new Error(
      result.stderr?.trim() || result.stdout?.trim() || "RBAC runtime validation failed",
    );
  }
  console.log(result.stdout.trim());
}

try {
  testNavigationConfig();
  await testRbacRuntime();
  console.log("\nvalidate-203b-club-navigation-v2: PASS");
} catch (err) {
  console.error("\nvalidate-203b-club-navigation-v2: FAIL", err.message);
  process.exit(1);
}
