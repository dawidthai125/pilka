#!/usr/bin/env node
/**
 * Sprint 18.1 — Multi-club public routing isolation + scale simulation (embedded PG).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSupabaseStubs } from "./staging-apply-migrations-175.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs/architecture");
const dataDir = join(root, `.staging-pg-181-${Date.now()}`);

const PIORUN_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const PILOT_ID = "b2c3d4e5-f6a7-8901-bcde-f12345678901";

const CLUBS = [
  { id: PIORUN_ID, slug: "piorun-wawrzenczyce", name: "Piorun Wawrzeńczyce", hero: "Piorun Hero" },
  { id: PILOT_ID, slug: "pilot-club", name: "Pilot Club", hero: "Pilot Hero" },
];

const PUBLIC_PAGES = ["", "/druzyna", "/tabela", "/mecze", "/aktualnosci", "/galeria", "/kontakt", "/sponsorzy", "/kibic"];

function clubPublicPath(slug, subpath = "/") {
  if (!subpath || subpath === "/") return `/${slug}`;
  return `/${slug}${subpath.startsWith("/") ? subpath : `/${subpath}`}`;
}

function normalizeSql(sql) {
  return sql
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u26a0\ufe0f/g, "")
    .replace(/[\u2013\u2014]/g, "-");
}

async function applyBaseline(client) {
  await client.query(normalizeSql(readFileSync(join(root, "supabase/baseline.sql"), "utf8")));
}

async function seedClubs(client) {
  for (const club of CLUBS) {
    await client.query(
      `INSERT INTO public.clubs (id, slug, public_name, official_name, settings, status)
       VALUES ($1, $2, $3, $4, '{}'::jsonb, 'active')
       ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, public_name = EXCLUDED.public_name`,
      [club.id, club.slug, club.name, club.name],
    );
    await client.query(
      `INSERT INTO public.website_settings (club_id, public_site_enabled, primary_color, secondary_color, accent_color, hero_title)
       VALUES ($1, TRUE, '#0B3D2E', '#F4C430', '#fff', $2)
       ON CONFLICT (club_id) DO UPDATE SET hero_title = EXCLUDED.hero_title`,
      [club.id, club.hero],
    );
    await client.query(
      `INSERT INTO public.website_news (club_id, slug, title, content, category, status, published_at)
       VALUES ($1, $2, $3, 'body', 'club', 'published', NOW())
       ON CONFLICT DO NOTHING`,
      [club.id, `${club.slug}-news`, `${club.name} news`],
    );
  }
}

async function fetchHomeBundle(client, slug) {
  const { rows } = await client.query(`SELECT public.get_public_home_bundle($1) AS payload`, [slug]);
  return rows[0]?.payload ?? null;
}

async function fetchNewsTitles(client, clubId) {
  const { rows } = await client.query(
    `SELECT title FROM public.website_news WHERE club_id = $1 AND status = 'published'`,
    [clubId],
  );
  return rows.map((r) => r.title);
}

function projectScale(clubCount) {
  const routesPerClub = PUBLIC_PAGES.length;
  const sitemapQueries = 1 + clubCount; // list + per-club sitemap RPC
  const homeBundleQueries = 1;
  return {
    clubCount,
    routePatterns: clubCount * routesPerClub,
    sitemapBuildQueries: sitemapQueries,
    homePageQueries: homeBundleQueries,
    middlewareLegacyLookupQueries: 1,
    estimatedSitemapUrls: clubCount * (routesPerClub + 2),
  };
}

async function main() {
  mkdirSync(dataDir, { recursive: true });
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres" });
  await client.connect();
  await ensureSupabaseStubs(client);
  await applyBaseline(client);
  await seedClubs(client);

  const isolation = [];
  for (const club of CLUBS) {
    const bundle = await fetchHomeBundle(client, club.slug);
    const hero = bundle?.heroTitle ?? bundle?.settings?.heroTitle ?? null;
    const news = await fetchNewsTitles(client, club.id);
    const leak = news.some((t) => CLUBS.some((other) => other.id !== club.id && t.includes(other.name) && !t.includes(club.name)));
    isolation.push({
      slug: club.slug,
      heroTitle: hero ?? bundle?.settings?.hero_title,
      newsCount: news.length,
      newsSample: news[0] ?? null,
      pass: hero === club.hero && !leak,
    });
  }

  const crossCheck =
    isolation[0]?.heroTitle !== isolation[1]?.heroTitle &&
    isolation.every((row) => row.pass);

  const scale = [1, 5, 20, 100].map(projectScale);

  const legacyPaths = PUBLIC_PAGES.filter(Boolean).map((p) => p);
  const legacyRedirectTarget = CLUBS[0].slug;

  const result = {
    sprint: "18.1",
    timestamp: new Date().toISOString(),
    isolation: { crossCheck, rows: isolation },
    routing: {
      model: "path-prefix",
      examples: CLUBS.map((c) => ({ home: clubPublicPath(c.slug), druzyna: clubPublicPath(c.slug, "/druzyna") })),
      legacy301: legacyPaths.map((p) => ({ from: p, to: clubPublicPath(legacyRedirectTarget, p) })),
    },
    scale,
    verdict: crossCheck ? "PASS" : "FAIL",
  };

  writeFileSync(join(docsDir, "sprint-181-simulation-results.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
  await client.end();
  process.exit(crossCheck ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
