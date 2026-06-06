#!/usr/bin/env node
/**
 * Static security audit — ETAP 14 Video Center (post-fix).
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

const actions = read("src/features/video/actions.ts");
const migration = read("supabase/migrations/20260616122000_stage14_audit_hardening.sql");
const uploadForm = read("src/features/video/components/video-upload-form.tsx");
const loaders = read("src/lib/video/loaders.ts");
const session = read("src/lib/auth/session.ts");
const detailView = read("src/features/video/components/video-detail-view.tsx");
const detailPage = read("src/app/(dashboard)/video/[id]/page.tsx");

// P0 — large upload via server memory / body limit
if (!actions.includes("Buffer.from(await file.arrayBuffer())")) {
  pass("S14-01", "Brak ładowania całego pliku w server action");
} else {
  fail("S14-01", "upload nadal buforuje plik w pamięci serwera");
}

if (
  actions.includes("initVideoUploadAction") &&
  actions.includes("completeVideoUploadAction") &&
  uploadForm.includes("supabase.storage") &&
  uploadForm.includes("initVideoUploadAction")
) {
  pass("S14-02", "Upload bezpośrednio z klienta do Supabase Storage");
} else {
  fail("S14-02", "Brak client-side upload flow");
}

// P0 — storage share escalation
if (
  migration.includes("actor_can_read_video_storage_path") &&
  migration.includes("actor_can_access_video_row(public.storage_video_id_from_path")
) {
  pass("S14-03", "Storage SELECT wymaga dostępu do konkretnego video_id");
} else {
  fail("S14-03", "Storage nadal oparte tylko na club_id");
}

const readVideosFn =
  migration.match(/CREATE OR REPLACE FUNCTION public\.actor_can_read_videos[\s\S]*?\$\$;/)?.[0] ?? "";

if (readVideosFn && !readVideosFn.includes("video_shares")) {
  pass("S14-04", "actor_can_read_videos bez eskalacji przez share");
} else {
  fail("S14-04", "actor_can_read_videos nadal udziela dostępu klubowego przez share");
}

// P1 — RLS / consistency
if (migration.includes("enforce_video_child_club_consistency") && migration.includes("video_shares_enforce_recipient")) {
  pass("S14-05", "Triggery spójności club_id i walidacja odbiorcy share");
} else {
  fail("S14-05", "Brak triggerów audit hardening");
}

if (migration.includes("storage_is_club_video_path")) {
  pass("S14-06", "Walidacja struktury ścieżki storage");
} else {
  fail("S14-06", "Brak storage_is_club_video_path");
}

// P1 — processing timeout
if (actions.includes("after(async") && actions.includes("scheduleVideoProcessing")) {
  pass("S14-07", "Pipeline AI uruchamiany w tle (after())");
} else {
  fail("S14-07", "Pipeline AI nadal synchroniczny w request upload");
}

// P1 — signed URL path validation
if (loaders.includes("isStoragePathForVideo")) {
  pass("S14-08", "Signed URL weryfikuje clubId/videoId w ścieżce");
} else {
  fail("S14-08", "getVideoSignedUrl bez walidacji ścieżki");
}

// P2 — share recipient app validation
if (actions.includes("verifyShareRecipient") && actions.includes("club_memberships")) {
  pass("S14-09", "shareVideoAction weryfikuje członkostwo odbiorcy");
} else {
  fail("S14-09", "Brak walidacji odbiorcy share w aplikacji");
}

// P2 — shared user detail access
if (session.includes("requireVideoDetailAccess") && detailPage.includes("requireVideoDetailAccess")) {
  pass("S14-10", "Strona szczegółów dostępna dla użytkowników z share");
} else {
  fail("S14-10", "Brak requireVideoDetailAccess na /video/[id]");
}

// P2 — mobile video
if (detailView.includes("playsInline")) {
  pass("S14-11", "Element video z playsInline (mobile)");
} else {
  fail("S14-11", "Brak playsInline na odtwarzaczu");
}

// P2 — enum validation
if (actions.includes("parseVideoCategory") && actions.includes("parseVideoEventType")) {
  pass("S14-12", "Walidacja enum category/eventType");
} else {
  fail("S14-12", "Brak walidacji enum w actions");
}

// P2 — news drafts RLS
if (migration.includes("video_news_drafts_select") && migration.includes("actor_can_manage_videos(club_id)")) {
  pass("S14-13", "Szkice newsów niewidoczne dla player/parent z share");
} else {
  fail("S14-13", "video_news_drafts_select nadal oparte na actor_can_read_videos");
}

if (fileExists("docs/archive/audit/stage-14-audit.md")) {
  pass("S14-14", "Raport audytu stage-14-audit.md istnieje");
} else {
  fail("S14-14", "Brak docs/archive/audit/stage-14-audit.md");
}

console.log("\n=== ETAP 14 Security Audit ===\n");
for (const check of checks) {
  const icon = check.status === "PASS" ? "✓" : "✗";
  console.log(`${icon} [${check.id}] ${check.message}`);
}
console.log(`\n${checks.length - failed}/${checks.length} PASS\n`);

process.exit(failed > 0 ? 1 : 0);
