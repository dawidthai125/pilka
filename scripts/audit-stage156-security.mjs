#!/usr/bin/env node
/**
 * Static security audit — ETAP 15.6 Communication Hub
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

const migration = read("supabase/migrations/20260619120000_stage156_communication_hub.sql");
const audit = read("supabase/migrations/20260619123000_stage156_audit_hardening.sql");
const actions = read("src/features/communication/actions.ts");
const dispatch = read("src/lib/communication/dispatch.ts");
const generator = read("src/lib/communication/generator.ts");
const permissions = read("src/config/permissions.ts");

if (migration.includes("ENABLE ROW LEVEL SECURITY") && migration.includes("actor_can_read_announcement")) {
  pass("S156-01", "RLS + helper actor_can_read_announcement");
} else {
  fail("S156-01", "Brak RLS/helpers ogłoszeń");
}

if (migration.includes("actor_can_access_team_chat") && audit.includes("team_chats_board_unique")) {
  pass("S156-02", "Scoped czaty + unikalność board/sponsor/team");
} else {
  fail("S156-02", "Brak scoped chat RLS");
}

const hardening = read("supabase/migrations/20260619124000_stage156_security_hardening.sql");
if (
  hardening.includes("actor_can_respond_coach_message") &&
  hardening.includes("actor_can_modify_coach_message")
) {
  pass("S156-09", "RSVP + coach message scope hardening");
} else {
  fail("S156-09", "Brak migracji security hardening");
}

if (
  dispatch.includes("getAnnouncementRecipientUserIds") &&
  dispatch.includes("getChatNotificationRecipients")
) {
  pass("S156-10", "Push scoped per audience/chat type");
} else {
  fail("S156-10", "Brak scoped push recipients");
}

if (audit.includes("enforce_announcement_publish_role") && audit.includes("enforce_coach_message_team_access")) {
  pass("S156-03", "Triggery publish/team dla ogłoszeń i coach messages");
} else {
  fail("S156-03", "Brak triggerów publish/team");
}

if (actions.includes("generateCommunicationAiAction") && generator.includes("templateDraft")) {
  pass("S156-04", "AI generuje szkic — template fallback");
} else {
  fail("S156-04", "Brak AI draft pattern");
}

if (!actions.includes("status: \"published\"") || actions.includes("canPublishCommunication")) {
  pass("S156-05", "Publikacja ogłoszeń wymaga uprawnień publish");
} else {
  fail("S156-05", "Brak gate publish");
}

if (generator.includes("aiUsed") && actions.includes("Propozycja AI gotowa (nie wysłano)")) {
  pass("S156-06", "AI nie wysyła automatycznie");
} else {
  fail("S156-06", "Brak guard AI auto-send");
}

if (dispatch.includes("notification_queue") && dispatch.includes("club_notifications")) {
  pass("S156-07", "Push + in-app przez istniejący PWA stack");
} else {
  fail("S156-07", "Brak integracji PWA dispatch");
}

if (permissions.includes("canReadCommunication") && permissions.includes("communication:publish")) {
  pass("S156-08", "RBAC communication w permissions.ts");
} else {
  fail("S156-08", "Brak RBAC communication");
}

console.log("\nETAP 15.6 Communication Hub — security audit\n");
for (const c of checks) {
  console.log(`[${c.status}] ${c.id}: ${c.message}`);
}
console.log(`\n${checks.length - failed}/${checks.length} PASS`);
if (failed) process.exit(1);
