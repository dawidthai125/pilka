/**
 * Post-deploy 18.4a validation — HTTP + DB (read-only).
 */
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const BASE = "https://pilka-mu.vercel.app";

async function fetchPage(path, redirect = "manual") {
  const res = await fetch(`${BASE}${path}`, { redirect });
  const html = res.status === 200 || (res.status === 307 && redirect === "follow") ? await res.text() : "";
  return {
    path,
    status: res.status,
    location: res.headers.get("location") ?? "",
    title: html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "",
    canon: html.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? "",
    html,
  };
}

console.log("=== HTTP PUBLIC ===");
for (const path of ["/", "/piorun-wawrzenczyce", "/pilot-club-test", "/sitemap.xml", "/robots.txt"]) {
  const r = await fetchPage(path);
  console.log(`${path}: ${r.status} title=${r.title.slice(0, 55)} canon=${r.canon}`);
}

const sm = await fetchPage("/sitemap.xml");
console.log("sitemap piorun:", sm.html.includes("/piorun-wawrzenczyce"));
console.log("sitemap pilot:", sm.html.includes("/pilot-club-test"));

console.log("\n=== HTTP PLATFORM (unauthenticated) ===");
for (const path of ["/platform", "/platform/clubs", "/login"]) {
  const r = await fetchPage(path);
  console.log(`${path}: ${r.status} -> ${r.location || "(no redirect)"}`);
}

const platformHtml = (await fetchPage("/platform", "follow")).html;
const markers = {
  dashboardKpi: /Kluby łącznie|Aktywne ligi|Stan platformy/i.test(platformHtml),
  dashboardOnboarding: /Kluby w onboardingu/i.test(platformHtml),
  dashboardSync: /Ostatnie synchronizacje/i.test(platformHtml),
  dashboardAudit: /Ostatnie operacje platformy/i.test(platformHtml),
  oldRedirectOnly: platformHtml.includes("Kluby piłkarskie") && !/Kluby łącznie/i.test(platformHtml),
  activationCard: /Aktywacja klubu publicznego/i.test(platformHtml),
};

console.log("platform HTML markers:", JSON.stringify(markers, null, 2));

const { connectDb } = await import("./lib/db-client.mjs");
const c = await connectDb();

const clubs = await c.query(`
  SELECT slug, public_name, status FROM public.clubs ORDER BY created_at
`);
console.log("\n=== DB CLUBS ===");
for (const r of clubs.rows) {
  console.log(r.slug, r.status, r.public_name);
}

const counts = await c.query(`
  SELECT status, COUNT(*)::int AS c FROM public.clubs GROUP BY status
`);
console.log("counts:", counts.rows);

const isolation = await c.query(`
  SELECT c.slug, c.public_name,
    ws.primary_color, ws.hero_title,
    COUNT(DISTINCT cc.channel)::int AS channels
  FROM clubs c
  LEFT JOIN website_settings ws ON ws.club_id = c.id
  LEFT JOIN content_channels cc ON cc.club_id = c.id
  WHERE c.slug IN ('piorun-wawrzenczyce', 'pilot-club-test')
  GROUP BY c.slug, c.public_name, ws.primary_color, ws.hero_title
`);
console.log("\n=== ISOLATION ===");
for (const r of isolation.rows) console.log(r);

const pilot = clubs.rows.find((r) => r.slug === "pilot-club-test");
if (pilot) {
  const audit = await c.query(
    `SELECT jsonb_array_elements(settings->'platformAudit')->>'action' AS action
     FROM clubs WHERE slug = 'pilot-club-test'`,
  );
  console.log("\npilot audit:", audit.rows.map((r) => r.action).join(", "));

  const jobs = await c.query(
    `SELECT status, records_processed, created_at FROM league_sync_jobs
     WHERE club_id = (SELECT id FROM clubs WHERE slug = 'pilot-club-test')
     ORDER BY created_at DESC LIMIT 3`,
  );
  console.log("pilot sync jobs:", jobs.rows);
}

const rpc = await c.query(`
  SELECT proname FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname IN ('platform_append_club_audit', 'platform_set_club_status')
`);
console.log("\nRPC on DB:", rpc.rows.map((r) => r.proname).join(", "));

await c.end();
