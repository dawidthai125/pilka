/**
 * Sprint 18.4a smoke — gates, activation, multi-club checks (prod DB).
 */
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const ACTOR = { id: "252d634c-4abb-4d25-ab15-c13f9f258052", email: "wlasciciel@piorun.test" };
const TEST_SLUG = "pilot-club-test";

const { evaluateClubActivationGates, activateClub } = await import("../src/lib/platform/club-activation.ts");
const { connectDb } = await import("./lib/db-client.mjs");
const { listLeagueSyncClubs } = await import("./lib/league-club-config.mjs");
const { createClient } = await import("@supabase/supabase-js");

const client = await connectDb();
const { rows: clubRows } = await client.query(
  "SELECT id, slug, status FROM public.clubs WHERE slug = $1",
  [TEST_SLUG],
);
await client.end();

if (!clubRows[0]) {
  console.log("SMOKE: SKIP — club not found", TEST_SLUG);
  process.exit(0);
}

const clubId = clubRows[0].id;
console.log("CLUB:", clubId, clubRows[0].status);

const gates = await evaluateClubActivationGates(clubId);
console.log("\n=== ACTIVATION GATES ===");
for (const g of gates?.gates ?? []) {
  console.log(`${g.code} ${g.verdict.toUpperCase()}: ${g.message}`);
}
for (const w of gates?.warnings ?? []) {
  console.log(`${w.code} WARNING: ${w.message}`);
}
console.log("canActivate:", gates?.canActivate);

if (gates?.canActivate) {
  const result = await activateClub({ clubId, actor: ACTOR });
  console.log("\nACTIVATE:", result.noop ? "noop" : "activated", result.slug);
} else {
  console.log("\nACTIVATE: SKIP — gates not pass");
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);
const syncClubs = await listLeagueSyncClubs(supabase);
const pilotInCron = syncClubs.some((c) => c.slug === TEST_SLUG);
console.log("\nCRON_ELIGIBLE pilot-club-test:", pilotInCron ? "YES" : "NO");

const BASE = "https://pilka-mu.vercel.app";
for (const path of ["/", `/${TEST_SLUG}`, "/piorun-wawrzenczyce"]) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  console.log(`HTTP ${path}: ${res.status}${loc ? " -> " + loc : ""}`);
}

const sitemapRes = await fetch(`${BASE}/sitemap.xml`);
const sitemapText = await sitemapRes.text();
console.log("\nSITEMAP pilot:", sitemapText.includes(`/${TEST_SLUG}`) ? "YES" : "NO");

const auditClient = await connectDb();
const { rows: auditRows } = await auditClient.query(
  `SELECT settings->'platformAudit' AS audit FROM public.clubs WHERE id = $1`,
  [clubId],
);
await auditClient.end();
const audit = auditRows[0]?.audit ?? [];
const actions = Array.isArray(audit) ? audit.map((e) => e.action) : [];
console.log("\nAUDIT actions:", actions.join(", "));
