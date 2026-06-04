import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const c = await connectDb();
const idx = await c.query(`
  SELECT indexname, indexdef FROM pg_indexes
  WHERE schemaname = 'public' AND tablename = 'availability_reasons'
  ORDER BY indexname
`);
console.log("=== INDEXES ===");
for (const r of idx.rows) console.log(r.indexname);

const clubs = await c.query(
  "SELECT slug, public_name, status FROM public.clubs ORDER BY created_at",
);
console.log("=== CLUBS ===");
for (const r of clubs.rows) console.log(`${r.slug} | ${r.status} | ${r.public_name}`);

const iso = await c.query(`
  SELECT c.slug, c.status,
    COUNT(DISTINCT cc.channel)::int AS channels,
    COUNT(DISTINCT ar.code)::int AS reasons,
    ws.primary_color
  FROM public.clubs c
  LEFT JOIN public.content_channels cc ON cc.club_id = c.id
  LEFT JOIN public.availability_reasons ar ON ar.club_id = c.id
  LEFT JOIN public.website_settings ws ON ws.club_id = c.id
  GROUP BY c.slug, c.status, ws.primary_color
  ORDER BY c.slug
`);
console.log("=== TENANT ISOLATION ===");
for (const r of iso.rows) {
  console.log(`${r.slug}: channels=${r.channels} reasons=${r.reasons} color=${r.primary_color ?? "—"}`);
}
await c.end();

const BASE = "https://pilka-mu.vercel.app";
for (const path of ["/", "/piorun-wawrzenczyce", "/pilot-club-test", "/platform/clubs"]) {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location") ?? "";
  console.log(`HTTP ${path}: ${res.status}${loc ? " -> " + loc : ""}`);
}
