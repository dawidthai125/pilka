import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const { createClub } = await import("../src/lib/platform/club-bootstrap.ts");

const TEST_SLUG = "pilot-club-test";
const ACTOR = { id: "252d634c-4abb-4d25-ab15-c13f9f258052", email: "wlasciciel@piorun.test" };

const client = await connectDb();
const { rows: existing } = await client.query(
  "SELECT id FROM public.clubs WHERE slug = $1",
  [TEST_SLUG],
);
await client.end();

let clubId = existing[0]?.id;
if (!clubId) {
  const created = await createClub({
    slug: TEST_SLUG,
    publicName: "Pilot Club Test",
    shortName: "Pilot",
    colors: { primary: "#0B3D2E", secondary: "#F4C430", accent: "#FFFFFF" },
    ownerEmail: "prezes@piorun.test",
    actor: ACTOR,
  });
  clubId = created.clubId;
  console.log("CREATE_CLUB: PASS", clubId);
} else {
  console.log("CREATE_CLUB: SKIP exists", clubId);
}

const verify = await connectDb();

const channels = await verify.query(
  "SELECT channel FROM public.content_channels WHERE club_id = $1 ORDER BY channel",
  [clubId],
);
console.log("CONTENT_CHANNELS:", channels.rows.map((r) => r.channel).join(", "));

const reasons = await verify.query(
  "SELECT code FROM public.availability_reasons WHERE club_id = $1 ORDER BY code",
  [clubId],
);
console.log("AVAILABILITY_REASONS:", reasons.rows.length, reasons.rows.map((r) => r.code).join(", "));

const clubRow = await verify.query(
  "SELECT slug, public_name, status FROM public.clubs WHERE id = $1",
  [clubId],
);
const branding = await verify.query(
  "SELECT primary_color, secondary_color, hero_title FROM public.website_settings WHERE club_id = $1",
  [clubId],
);
console.log(
  "BRANDING:",
  clubRow.rows[0]?.public_name,
  branding.rows[0]?.primary_color,
  "status=" + clubRow.rows[0]?.status,
);

const onboarding = await verify.query(
  "SELECT id FROM public.teams WHERE club_id = $1",
  [clubId],
);
console.log("TEAM:", onboarding.rows.length > 0 ? "yes" : "no");

await verify.end();

const BASE = "https://pilka-mu.vercel.app";
for (const path of [`/${TEST_SLUG}`, "/piorun-wawrzenczyce"]) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
  const canon = html.match(/rel="canonical" href="([^"]+)"/)?.[1] ?? "";
  console.log(`ROUTE ${path}: ${res.status} title=${title.slice(0, 50)} canon=${canon}`);
}

const piorun = await fetch(`${BASE}/piorun-wawrzenczyce`).then((r) => r.text());
const pilot = await fetch(`${BASE}/${TEST_SLUG}`).then((r) => r.text());
console.log(
  "ISOLATION:",
  /Piorun Wawrze/i.test(piorun) && !/Pilot Club Test/i.test(piorun) && /Pilot Club Test/i.test(pilot)
    ? "PASS"
    : "FAIL",
);
