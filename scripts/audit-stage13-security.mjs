#!/usr/bin/env node
/**
 * Static security audit — ETAP 13 AI Club Manager (post-fix).
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

// P0 — cross-club writes via agent delegation
const trainingActions = read("src/features/training/actions.ts");
const createTrainingBlock = trainingActions.slice(
  trainingActions.indexOf("export async function createTraining"),
  trainingActions.indexOf("export async function updateTraining"),
);
if (
  createTrainingBlock.includes("const clubId = access.clubId") &&
  createTrainingBlock.includes("club_id: clubId") &&
  !createTrainingBlock.includes("DEFAULT_CLUB_ID")
) {
  pass("S13-01", "createTraining scoped do access.clubId");
} else {
  fail("S13-01", "createTraining nadal używa DEFAULT_CLUB_ID");
}

const matchesActions = read("src/features/matches/actions.ts");
const createMatchBlock = matchesActions.slice(
  matchesActions.indexOf("export async function createMatch"),
  matchesActions.indexOf("export async function updateMatch"),
);
if (
  createMatchBlock.includes("const clubId = access.clubId") &&
  createMatchBlock.includes("club_id: clubId") &&
  !createMatchBlock.includes("DEFAULT_CLUB_ID")
) {
  pass("S13-02", "createMatch scoped do access.clubId");
} else {
  fail("S13-02", "createMatch nadal używa DEFAULT_CLUB_ID");
}

// P1 — approvals & side effects
const registry = read("src/lib/ai/agent/tools/registry.ts");
if (
  registry.includes('generateReport') &&
  registry.includes("requiresApproval: true") &&
  registry.match(/generateReport:[\s\S]*?riskLevel: "medium"/)
) {
  pass("S13-03", "generateReport wymaga zatwierdzenia (MEDIUM)");
} else {
  fail("S13-03", "generateReport bez wymaganego zatwierdzenia");
}

if (!registry.includes("addNote")) {
  pass("S13-04", "addNote usunięte z rejestru narzędzi");
} else {
  fail("S13-04", "addNote nadal w rejestrze (zawsze fail)");
}

const writeTools = read("src/lib/ai/agent/tools/write.ts");
if (
  writeTools.includes("safeNotificationHref") &&
  writeTools.includes("STAFF_NOTIFICATION_ROLES")
) {
  pass("S13-05", "createNotification: href + odbiorcy sztabu");
} else {
  fail("S13-05", "createNotification bez walidacji href / scope odbiorców");
}

const runner = read("src/lib/ai/agent/runner.ts");
if (
  runner.includes("toolFailures") &&
  runner.includes('"tool_failed"') &&
  runner.includes("unrecognized_command")
) {
  pass("S13-06", "Runner: failed task + logi audytu przy błędach");
} else {
  fail("S13-06", "Runner nie oznacza task failed przy błędach narzędzi");
}

// P2 — read tools & intent
const readTools = read("src/lib/ai/agent/tools/read.ts");
if (
  readTools.includes('throw new Error("Brak dostępu do finansów.")') &&
  !readTools.includes('return { error: "Brak dostępu')
) {
  pass("S13-07", "Read tools rzucają błąd zamiast zwracać sukces z error");
} else {
  fail("S13-07", "Read tools nadal zwracają { error } jako sukces");
}

const intent = read("src/lib/ai/agent/intent.ts");
if (intent.includes("return [];") && !intent.includes("minAttendanceRate: 100")) {
  pass("S13-08", "Intent fallback nie wykonuje fałszywego getPlayers");
} else {
  fail("S13-08", "Intent fallback nadal wykonuje getPlayers(100%)");
}

// RLS hardening migration
if (fileExists("supabase/migrations/20260615130000_stage13_audit_rls_hardening.sql")) {
  const rls = read("supabase/migrations/20260615130000_stage13_audit_rls_hardening.sql");
  if (rls.includes("ai_task_logs_insert_own") && rls.includes("FROM public.ai_tasks t")) {
    pass("S13-09", "Migracja RLS: insert logów/tool_calls wymaga własnego task_id");
  } else {
    fail("S13-09", "Migracja RLS niekompletna");
  }
} else {
  fail("S13-09", "Brak migracji stage13_audit_rls_hardening");
}

// Server actions gate
const aiManagerActions = read("src/features/ai-manager/actions.ts");
if (
  aiManagerActions.includes("requireAccessContext") &&
  aiManagerActions.includes("canUseAiChat")
) {
  pass("S13-10", "Server actions wymagają sesji + canUseAiChat");
} else {
  fail("S13-10", "Brak gate na server actions agenta");
}

// Approval ownership
if (
  runner.includes('.eq("user_id", access.userId)') &&
  runner.includes("approveAgentAction")
) {
  pass("S13-11", "Zatwierdzenia scoped do user_id właściciela");
} else {
  fail("S13-11", "Brak weryfikacji właściciela zatwierdzenia");
}

// Permissions before every tool
if (runner.includes("assertToolPermission(access, call.toolName)")) {
  pass("S13-12", "assertToolPermission przed każdym tool call");
} else {
  fail("S13-12", "Brak assertToolPermission w runner");
}

console.log("\n=== Audyt ETAP 13 — AI Club Manager ===\n");
for (const c of checks) {
  const icon = c.status === "PASS" ? "✓" : "✗";
  console.log(`${icon} [${c.id}] ${c.message}`);
}
console.log(`\nWynik: ${checks.length - failed}/${checks.length} PASS, ${failed} FAIL\n`);

process.exit(failed > 0 ? 1 : 0);
