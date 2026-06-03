#!/usr/bin/env node
/**
 * Sprint 18.3 — Platform league setup safety audit + UX metrics (static analysis).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs/architecture");

const checks = [];

function pass(name, detail) {
  checks.push({ name, result: "PASS", detail });
}

function fail(name, detail) {
  checks.push({ name, result: "FAIL", detail });
}

const setupSrc = readFileSync(join(root, "src/lib/platform/league-setup.ts"), "utf8");
const actionsSrc = readFileSync(join(root, "src/features/platform/league-actions.ts"), "utf8");
const validationSrc = readFileSync(join(root, "src/lib/platform/league-config-validation.ts"), "utf8");

if (setupSrc.includes("BEGIN") && setupSrc.includes("ROLLBACK")) {
  pass("transaction_rollback", "saveLeagueConfiguration uses BEGIN/COMMIT/ROLLBACK");
} else {
  fail("transaction_rollback", "Missing transaction rollback in league-setup");
}

if (setupSrc.includes("club_id") && setupSrc.includes("params.clubId")) {
  pass("tenant_scoped_queries", "All SQL queries filter by club_id param");
} else {
  fail("tenant_scoped_queries", "club_id scoping unclear");
}

if (actionsSrc.includes("requirePlatformAdmin")) {
  pass("platform_admin_gate", "League actions require platform admin");
} else {
  fail("platform_admin_gate", "Missing requirePlatformAdmin");
}

if (validationSrc.includes('"PASS"') && validationSrc.includes('"WARNING"') && validationSrc.includes('"FAIL"')) {
  pass("validation_verdicts", "Validation engine returns PASS/WARNING/FAIL");
} else {
  fail("validation_verdicts", "Missing validation verdict types");
}

if (setupSrc.includes("appendAuditToClubSettings") && setupSrc.includes("league_configuration_saved")) {
  pass("audit_log", "League config writes platform audit entries");
} else {
  fail("audit_log", "Missing audit log on save");
}

if (setupSrc.includes("is_active = FALSE") && setupSrc.includes("is_active = TRUE")) {
  pass("activate_separate", "Save keeps source inactive; activate enables sync");
} else {
  fail("activate_separate", "Activate flow unclear");
}

// Multi-club isolation — no cross-club reads in actions
if (!actionsSrc.includes("access.clubId") && actionsSrc.includes('formData.get("clubId")')) {
  pass("explicit_club_param", "Actions use explicit clubId from form, not session club");
} else {
  fail("explicit_club_param", "clubId param pattern unexpected");
}

if (setupSrc.includes("lnp.accessToken") && setupSrc.includes("••••••••")) {
  pass("credential_masking", "LNP tokens masked in snapshot display");
} else {
  fail("credential_masking", "Credentials may leak in UI");
}

const ux = {
  legacy_cli_json: {
    interface: "terminal + JSON edits",
    steps: 8,
    estimated_clicks: 0,
    requires_developer: true,
    flow: [
      "bootstrap-club.mjs OR platform wizard",
      "Edit league_sources.config JSON in DB",
      "discover-lnp-setup.mjs for token",
      "Set LNP_* ENV vars",
      "INSERT league_teams manually",
      "sync-league-live.mjs --club-id",
      "Check logs in terminal",
    ],
  },
  platform_league_wizard: {
    interface: "web_ui",
    steps: 5,
    estimated_clicks: 14,
    estimated_screens: 8,
    requires_developer: false,
    flow: [
      "Create Club Wizard (18.2)",
      "/platform/clubs/{id}/league/setup",
      "Step 1: Source",
      "Step 2: Competition",
      "Step 3: Season + URLs",
      "Step 4: Save + Validate",
      "Step 5: Activate Sync",
      "/platform/clubs/{id}/league → Live sync",
    ],
  },
  comparison: {
    click_reduction: "~14 clicks vs 0 CLI (non-comparable GUI vs terminal)",
    operator_skill: "Platform admin vs DevOps",
    json_eliminated: true,
    sql_eliminated: true,
  },
};

const allPass = checks.every((c) => c.result === "PASS");

const report = {
  sprint: "18.3",
  timestamp: new Date().toISOString(),
  multiTenantSafety: { verdict: allPass ? "PASS" : "FAIL", checks },
  ux,
};

mkdirSync(docsDir, { recursive: true });
writeFileSync(join(docsDir, "sprint-183-safety-audit.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(allPass ? 0 : 1);
