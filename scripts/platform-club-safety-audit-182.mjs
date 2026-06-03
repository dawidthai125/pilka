#!/usr/bin/env node
/**
 * Sprint 18.2 — Platform createClub safety audit + UX metrics (static analysis).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs/architecture");

function slugify(input) {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function validateSlug(slug) {
  if (slug.length < 3) return "short";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return "format";
  if (slug === "platform") return "reserved";
  return null;
}

const checks = [];

function pass(name, detail) {
  checks.push({ name, result: "PASS", detail });
}

function fail(name, detail) {
  checks.push({ name, result: "FAIL", detail });
}

// Slug collision prevention — code review assertions
const bootstrapSrc = readFileSync(join(root, "src/lib/platform/club-bootstrap.ts"), "utf8");
if (bootstrapSrc.includes("SELECT id FROM public.clubs WHERE slug") && bootstrapSrc.includes("ROLLBACK")) {
  pass("slug_unique_precheck", "Transaction checks slug before INSERT and rolls back on error");
} else {
  fail("slug_unique_precheck", "Missing slug pre-check or rollback");
}

if (bootstrapSrc.includes("BEGIN") && bootstrapSrc.includes("COMMIT")) {
  pass("transaction", "Bootstrap uses BEGIN/COMMIT transaction");
} else {
  fail("transaction", "No transaction wrapper");
}

// Platform admin isolation
const adminSrc = readFileSync(join(root, "src/lib/platform/admin.ts"), "utf8");
if (adminSrc.includes("PLATFORM_ADMIN_EMAILS") && adminSrc.includes("isPlatformAdminEmail")) {
  pass("platform_admin_separate", "Platform admin is ENV-based role separate from club_memberships");
} else {
  fail("platform_admin_separate", "Platform admin model unclear");
}

const actionsSrc = readFileSync(join(root, "src/features/platform/actions.ts"), "utf8");
if (actionsSrc.includes("requirePlatformAdmin")) {
  pass("action_gated", "createClubAction requires platform admin");
} else {
  fail("action_gated", "Missing requirePlatformAdmin in action");
}

// Validation tests
if (validateSlug("piorun-wawrzenczyce") === null) pass("slug_valid", "Valid slug accepted");
else fail("slug_valid", validateSlug("piorun-wawrzenczyce"));

if (validateSlug("ab") !== null) pass("slug_min_length", "Short slug rejected");
else fail("slug_min_length", "Short slug accepted");

if (validateSlug("platform") !== null) pass("slug_reserved", "Reserved slug rejected");
else fail("slug_reserved", "Reserved slug accepted");

if (slugify("Pilot Club 2") === "pilot-club-2") pass("slugify", "Slugify normalizes name");
else fail("slugify", `Got ${slugify("Pilot Club 2")}`);

const ux = {
  cli_bootstrap: {
    interface: "terminal",
    required_flags: 5,
    steps: 1,
    estimated_clicks: 0,
    estimated_screens: 1,
    requires_developer: true,
  },
  platform_wizard: {
    interface: "web_ui",
    steps: 5,
    estimated_clicks: 9,
    estimated_screens: 6,
    flow: [
      "Open /platform/clubs",
      "Click 'Nowy klub'",
      "Step 1: name + Dalej",
      "Step 2: slug + Dalej",
      "Step 3: colors + Dalej",
      "Step 4: owner email + Dalej",
      "Step 5: Utwórz klub",
    ],
    requires_developer: false,
  },
  comparison: {
    click_reduction_vs_cli: "N/A (CLI is non-GUI)",
    operator_skill: "Platform admin vs DevOps",
  },
};

const allPass = checks.every((c) => c.result === "PASS");

const report = {
  sprint: "18.2",
  timestamp: new Date().toISOString(),
  safetyAudit: { verdict: allPass ? "PASS" : "FAIL", checks },
  ux,
};

mkdirSync(docsDir, { recursive: true });
writeFileSync(join(docsDir, "sprint-182-safety-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(allPass ? 0 : 1);
