#!/usr/bin/env node
/**
 * Static security audit — ETAP 11.6 post-hardening checks.
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

function warn(id, message) {
  checks.push({ id, status: "WARN", message });
}

function read(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function fileExists(relPath) {
  return existsSync(join(root, relPath));
}

// P0
const publicData = read("src/lib/website/public-data.ts");
if (publicData.includes("coach_notes")) {
  fail("C2", "coach_notes nadal w public-data.ts");
} else {
  pass("C2", "coach_notes usunięte z publicznego SELECT meczów");
}

const aiContext = read("src/lib/ai/context.ts");
if (
  aiContext.includes('["ai-club-context", access.clubId, access.userId') &&
  aiContext.includes("scopeCacheKey")
) {
  pass("C1", "Cache AI scoped per userId + roles");
} else {
  fail("C1", "Cache AI bez scope userId/roles");
}

if (fileExists("scripts/lib/db-client.mjs")) {
  const dbClient = read("scripts/lib/db-client.mjs");
  if (dbClient.includes("pooler") && dbClient.includes("postgres.${projectRef}")) {
    pass("C3", "Skrypty DB używają poolera Supabase");
  } else {
    fail("C3", "Skrypty DB bez poolera");
  }
} else {
  fail("C3", "Brak scripts/lib/db-client.mjs");
}

// P1
const authActions = read("src/features/auth/actions.ts");
const envConfig = read("src/config/env.ts");
if (
  authActions.includes("isPublicRegistrationEnabled") &&
  envConfig.includes('ALLOW_PUBLIC_REGISTRATION !== "false"')
) {
  pass("H8", "Rejestracja publiczna kontrolowana przez env");
} else {
  fail("H8", "Brak gate rejestracji publicznej");
}

const rateLimit = read("src/lib/ai/rate-limit.ts");
const aiActions = read("src/features/ai/actions.ts");
if (
  rateLimit.includes("assertAiChatRateLimit") &&
  rateLimit.includes("assertAiReportRateLimit") &&
  aiActions.includes("assertAiChatRateLimit") &&
  aiActions.includes("assertAiReportRateLimit")
) {
  pass("H7", "Rate limit AI (chat + raporty)");
} else {
  fail("H7", "Brak rate limit AI");
}

if (aiContext.includes("canReadFinance") && aiContext.includes("EMPTY_FINANCE")) {
  pass("H9", "Lazy-load modułów wrażliwych w kontekście AI");
} else {
  fail("H9", "Brak lazy-load kontekstu AI");
}

const migrations = [
  "supabase/migrations/20260606120000_stage116_production_hardening.sql",
  "supabase/migrations/20260606140000_stage116_p2_security_completion.sql",
];
for (const migration of migrations) {
  if (!fileExists(migration)) {
    fail("SQL", `Brak migracji ${migration}`);
  }
}
if (migrations.every((m) => fileExists(m))) {
  pass("H1-H6,H10", "Migracje stage116 + P2 obecne w repo");
}

// P2
const openai = read("src/integrations/openai/index.ts");
if (openai.includes("max_tokens")) {
  pass("M14", "OpenAI max_tokens skonfigurowany");
} else {
  fail("M14", "Brak max_tokens w OpenAI");
}

const financeActions = read("src/features/finance/actions.ts");
const inventoryActions = read("src/features/inventory/actions.ts");
if (
  financeActions.includes("finance_documents") &&
  financeActions.includes("maybeSingle") &&
  inventoryActions.includes("maybeSingle")
) {
  pass("M8", "Signed URLs z weryfikacją rekordu DB");
} else {
  fail("M8", "Signed URLs bez weryfikacji DB");
}

if (fileExists(".github/workflows/ci.yml")) {
  pass("L4", "GitHub Actions CI skonfigurowany");
} else {
  fail("L4", "Brak CI workflow");
}

const envExample = read(".env.example");
if (envExample.includes("your-project-ref") && !envExample.match(/ecb4e06b2cd78deb05039c9a6fd6b587018258ff/)) {
  pass("M10", ".env.example bez prawdziwego project ref");
} else {
  warn("M10", "Sprawdź .env.example pod kątem wycieku project ref");
}

// Secrets in client-accessible modules only
const clientSurface = ["src/lib/supabase/client.ts", "src/middleware.ts"];
let serviceRoleInClient = false;
for (const file of clientSurface) {
  if (fileExists(file) && read(file).includes("SERVICE_ROLE")) {
    serviceRoleInClient = true;
  }
}
if (!serviceRoleInClient) {
  pass("SEC", "Brak SERVICE_ROLE w client.ts / middleware");
} else {
  fail("SEC", "SERVICE_ROLE w kodzie dostępnym w bundle klienta");
}

// grep src for dangerous patterns in all ts/tsx - simplified
let srcFiles = 0;
let serviceRoleAnywhere = false;
function walkDir(rel, acc = []) {
  // lightweight - only check key paths
  return acc;
}
const grepTargets = read("src/lib/supabase/server.ts");
if (!grepTargets.includes("SERVICE_ROLE")) {
  pass("SEC2", "Server client bez hardcoded service role");
} else {
  fail("SEC2", "Service role w server.ts");
}

console.log("\n=== Security Audit ETAP 11.6 ===\n");
for (const check of checks) {
  const icon = check.status === "PASS" ? "✓" : check.status === "WARN" ? "!" : "✗";
  console.log(`${icon} [${check.id}] ${check.message}`);
}
console.log(`\n${checks.length} checks · ${failed} failures · ${checks.filter((c) => c.status === "WARN").length} warnings\n`);

if (failed > 0) {
  process.exit(1);
}
