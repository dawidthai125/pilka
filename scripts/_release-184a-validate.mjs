/**
 * Sprint 18.4a release validation — runtime smoke (libs + prod DB).
 */
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const ACTOR = { id: "252d634c-4abb-4d25-ab15-c13f9f258052", email: "wlasciciel@piorun.test" };
const PILOT_SLUG = "pilot-club-test";

const results = [];

function pass(label, detail = "") {
  results.push({ label, ok: true, detail });
  console.log(`PASS ${label}${detail ? ": " + detail : ""}`);
}
function fail(label, detail = "") {
  results.push({ label, ok: false, detail });
  console.log(`FAIL ${label}${detail ? ": " + detail : ""}`);
}

const { evaluateClubActivationGates, activateClub } = await import("../src/lib/platform/club-activation.ts");
const { loadPlatformDashboard } = await import("../src/lib/platform/dashboard.ts");
const { createClub } = await import("../src/lib/platform/club-bootstrap.ts");
const { saveLeagueConfiguration, activateLeagueSync, loadLeagueSetupSnapshot } = await import(
  "../src/lib/platform/league-setup.ts"
);
const { connectDb } = await import("./lib/db-client.mjs");

// --- Dashboard ---
try {
  const dash = await loadPlatformDashboard();
  if (dash.kpi.totalClubs >= 1 && typeof dash.kpi.activeClubs === "number") {
    pass("Dashboard loadPlatformDashboard", `clubs=${dash.kpi.totalClubs} active=${dash.kpi.activeClubs}`);
  } else {
    fail("Dashboard loadPlatformDashboard", "invalid KPI");
  }
} catch (e) {
  fail("Dashboard loadPlatformDashboard", e.message);
}

// --- Pilot state ---
const client = await connectDb();
const { rows: pilotRows } = await client.query(
  "SELECT id, slug, status FROM public.clubs WHERE slug = $1",
  [PILOT_SLUG],
);
const pilot = pilotRows[0];
if (!pilot) {
  fail("pilot-club-test exists");
} else {
  pass("pilot-club-test exists", `${pilot.id} status=${pilot.status}`);
}

if (pilot) {
  const gates = await evaluateClubActivationGates(pilot.id);
  const gateSummary = gates?.gates.map((g) => `${g.code}:${g.verdict}`).join(" ");
  console.log("  gates:", gateSummary);
  if (gates?.warnings.length) console.log("  warnings:", gates.warnings.map((w) => w.code).join(" "));

  if (pilot.status === "active") {
    pass("pilot onboarding→active", "already active");
    const noop = await activateClub({ clubId: pilot.id, actor: ACTOR });
    if (noop.noop) pass("activateClub idempotent");
    else fail("activateClub idempotent");
  } else if (gates?.canActivate) {
    try {
      const activated = await activateClub({ clubId: pilot.id, actor: ACTOR });
      pass("pilot activateClub", activated.noop ? "noop" : `active /${activated.slug}`);
      const { rows: after } = await client.query("SELECT status FROM public.clubs WHERE id = $1", [pilot.id]);
      if (after[0]?.status === "active") pass("pilot status=active in DB");
      else fail("pilot status=active in DB", after[0]?.status);
    } catch (e) {
      fail("pilot activateClub", e.message);
    }
  } else {
    fail("pilot onboarding→active", `blocked: ${gates?.gates.filter((g) => g.verdict === "fail").map((g) => g.code).join(",")}`);
  }

  const { rows: auditRows } = await client.query(
    `SELECT jsonb_array_elements(settings->'platformAudit')->>'action' AS action
     FROM public.clubs WHERE id = $1`,
    [pilot.id],
  );
  const actions = auditRows.map((r) => r.action);
  if (actions.includes("club_created")) pass("audit club_created");
  else fail("audit club_created");
  if (actions.includes("club_activated")) pass("audit club_activated");
  else if (pilot.status === "active" || (await client.query("SELECT status FROM clubs WHERE id=$1", [pilot.id])).rows[0]?.status === "active") {
    fail("audit club_activated", "active but no audit");
  } else {
    console.log("SKIP audit club_activated (not activated yet)");
  }
}

// --- Ephemeral E2E: create → league save (minimal) → gates (no cleanup) ---
const testSlug = `release-184a-${Date.now().toString(36)}`;
let e2eClubId = null;
try {
  const created = await createClub({
    slug: testSlug,
    publicName: "Release 184a Test",
    shortName: "R18",
    colors: { primary: "#111111", secondary: "#222222", accent: "#FFFFFF" },
    ownerEmail: "prezes@piorun.test",
    actor: ACTOR,
  });
  e2eClubId = created.clubId;
  pass("Create Club createClub()", e2eClubId);

  await saveLeagueConfiguration({
    clubId: e2eClubId,
    providerId: "manual_import",
    seasonName: "2025/2026",
    competitionName: "Test Liga",
    manualAdapter: "csv",
    actor: ACTOR,
  });
  pass("League Setup saveLeagueConfiguration");

  await activateLeagueSync({ clubId: e2eClubId, actor: ACTOR, triggerLiveSync: false });
  pass("League Setup activateLeagueSync");

  const snap = await loadLeagueSetupSnapshot(e2eClubId);
  if (snap?.sourceActive) pass("League source active after activate");
  else fail("League source active after activate");

  const e2eGates = await evaluateClubActivationGates(e2eClubId);
  if (e2eGates?.canActivate) {
    const act = await activateClub({ clubId: e2eClubId, actor: ACTOR });
    pass("Activate Club E2E", `/${act.slug}`);
    const { rows } = await client.query("SELECT status FROM public.clubs WHERE id = $1", [e2eClubId]);
    if (rows[0]?.status === "active") pass("E2E status active");
    else fail("E2E status active");
  } else {
    const fails = e2eGates?.gates.filter((g) => g.verdict === "fail").map((g) => g.code);
    fail("Activate Club E2E gates", fails?.join(","));
  }
} catch (e) {
  fail("E2E chain", e.message);
}

// cleanup ephemeral test club (archive-like: set onboarding + note — or delete if safe)
if (e2eClubId) {
  await client.query(`UPDATE public.clubs SET status = 'onboarding', slug = slug || '-archived-184a' WHERE id = $1 AND slug = $2`, [
    e2eClubId,
    testSlug,
  ]);
  console.log("CLEANUP: renamed ephemeral club slug");
}

await client.end();

// Prod HTTP (pre-deploy baseline)
const BASE = "https://pilka-mu.vercel.app";
const platformRes = await fetch(`${BASE}/platform`, { redirect: "manual" });
if (platformRes.status === 307 || platformRes.status === 302) {
  const loc = platformRes.headers.get("location") ?? "";
  if (loc.includes("/platform/clubs") && !loc.includes("dashboard")) {
    console.log(`NOTE prod /platform → ${platformRes.status} ${loc} (pre-deploy redirect expected)`);
  }
}

const failed = results.filter((r) => !r.ok);
console.log("\n=== SUMMARY ===");
console.log(`PASS ${results.filter((r) => r.ok).length} / FAIL ${failed.length}`);
if (failed.length) {
  for (const f of failed) console.log(`  - ${f.label}: ${f.detail}`);
  process.exit(1);
}
