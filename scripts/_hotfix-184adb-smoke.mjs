/**
 * Hotfix 18.4a-db + 18.4a smoke — pilot-club-test full path.
 */
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const ACTOR = { id: "252d634c-4abb-4d25-ab15-c13f9f258052", email: "wlasciciel@piorun.test" };
const PILOT_SLUG = "pilot-club-test";

const { saveLeagueConfiguration, activateLeagueSync } = await import("../src/lib/platform/league-setup.ts");
const { activateClub, evaluateClubActivationGates } = await import("../src/lib/platform/club-activation.ts");
const { connectDb } = await import("./lib/db-client.mjs");
const { listLeagueSyncClubs } = await import("./lib/league-club-config.mjs");

const client = await connectDb();
const { rows } = await client.query("SELECT id, status FROM public.clubs WHERE slug = $1", [PILOT_SLUG]);
const pilotId = rows[0]?.id;
if (!pilotId) {
  console.log("FAIL: pilot not found");
  process.exit(1);
}
console.log("PILOT:", pilotId, "status=", rows[0].status);

if (rows[0].status === "onboarding") {
  console.log("\n--- League Setup ---");
  await saveLeagueConfiguration({
    clubId: pilotId,
    providerId: "manual_import",
    seasonName: "2025/2026",
    competitionName: "Liga testowa pilot",
    manualAdapter: "csv",
    actor: ACTOR,
  });
  console.log("PASS saveLeagueConfiguration");

  await activateLeagueSync({ clubId: pilotId, actor: ACTOR, triggerLiveSync: false });
  console.log("PASS activateLeagueSync");

  const gates = await evaluateClubActivationGates(pilotId);
  console.log("Gates:", gates?.gates.map((g) => `${g.code}:${g.verdict}`).join(" "));
  console.log("canActivate:", gates?.canActivate);

  if (gates?.canActivate) {
    const result = await activateClub({ clubId: pilotId, actor: ACTOR });
    console.log("PASS activateClub", result.noop ? "noop" : "activated");
  } else {
    console.log("FAIL: cannot activate — gates");
    process.exit(1);
  }
} else {
  console.log("SKIP league/activate — already", rows[0].status);
  await activateClub({ clubId: pilotId, actor: ACTOR });
}

const { rows: after } = await client.query(
  "SELECT status, settings->'platformAudit' AS audit FROM public.clubs WHERE id = $1",
  [pilotId],
);
console.log("\nDB status:", after[0]?.status);
const audit = after[0]?.audit ?? [];
const actions = Array.isArray(audit) ? audit.map((e) => e.action) : [];
console.log("Audit:", actions.join(", "));

await client.end();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const syncClubs = await listLeagueSyncClubs(supabase);
console.log("\nCRON eligible:", syncClubs.some((c) => c.slug === PILOT_SLUG) ? "YES" : "NO (manual_import expected NO)");

const BASE = "https://pilka-mu.vercel.app";
for (const path of ["/", `/${PILOT_SLUG}`, "/piorun-wawrzenczyce"]) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  let title = "";
  if (res.status === 200) {
    const html = await res.text();
    title = html.match(/<title>([^<]+)<\/title>/)?.[1]?.slice(0, 60) ?? "";
  }
  console.log(`HTTP ${path}: ${res.status}${loc ? " -> " + loc : ""} ${title}`);
}

const sm = await fetch(`${BASE}/sitemap.xml`).then((r) => r.text());
console.log("SITEMAP pilot:", sm.includes(`/${PILOT_SLUG}`) ? "YES" : "NO (prod deploy pending)");
