#!/usr/bin/env node
/**
 * Sprint 18.0 — Club #2 onboarding simulation (embedded PG only, NOT production).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureSupabaseStubs } from "./staging-apply-migrations-175.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const docsDir = join(root, "docs/architecture");
const dataDir = join(root, `.staging-pg-180-${Date.now()}`);

const PIORUN_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const PILOT = {
  slug: "pilot-club",
  name: "Pilot Club",
  shortName: "PC",
  colors: { primary: "#1e3a5f", secondary: "#f5c518", accent: "#ffffff" },
  ownerEmail: "owner@pilot-club.local",
  ownerId: "11111111-1111-4111-8111-111111111111",
  piorunOwnerId: "22222222-2222-4222-8222-222222222222",
};

function normalizeSql(sql) {
  return sql
    .replace(/\u2192/g, "->")
    .replace(/\u2190/g, "<-")
    .replace(/\u2194/g, "<->")
    .replace(/\u26a0\ufe0f/g, "")
    .replace(/[\u2013\u2014]/g, "-");
}

async function applyBaseline(client) {
  const raw = normalizeSql(readFileSync(join(root, "supabase/baseline.sql"), "utf8"));
  await client.query(raw);
}

async function seedPiorun(client) {
  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, 'owner@piorun.local'), ($2, 'coach@piorun.local')
     ON CONFLICT DO NOTHING`,
    [PILOT.piorunOwnerId, "33333333-3333-4333-8333-333333333333"],
  );
  await client.query(
    `INSERT INTO public.clubs (id, slug, public_name, official_name, settings)
     VALUES ($1, 'piorun-wawrzenczyce', 'Piorun Wawrzeńczyce', 'GLKS Mietków', '{"shortName":"PW"}'::jsonb)
     ON CONFLICT DO NOTHING`,
    [PIORUN_ID],
  );
  await client.query(
    `INSERT INTO public.teams (club_id, name, category, season, is_active)
     VALUES ($1, 'PW Seniorzy', 'seniors', '2025/2026', TRUE)`,
    [PIORUN_ID],
  );
  await client.query(
    `INSERT INTO public.website_settings (club_id, public_site_enabled, primary_color, secondary_color, accent_color, hero_title)
     VALUES ($1, TRUE, '#0B3D2E', '#F4C430', '#ffffff', 'Piorun Wawrzeńczyce')`,
    [PIORUN_ID],
  );
  await client.query(
    `INSERT INTO public.players (club_id, first_name, last_name, date_of_birth, status)
     VALUES ($1, 'Jan', 'Piorun', '2000-01-01', 'active')`,
    [PIORUN_ID],
  );
  await client.query(
    `INSERT INTO public.profiles (id, email, full_name) VALUES ($1, 'owner@piorun.local', 'Piorun Owner')
     ON CONFLICT DO NOTHING`,
    [PILOT.piorunOwnerId],
  );
  await client.query(
    `INSERT INTO public.club_memberships (club_id, user_id, role, status)
     VALUES ($1, $2, 'owner', 'active')`,
    [PIORUN_ID, PILOT.piorunOwnerId],
  );
}

async function bootstrapPilot(client) {
  const seasonName = "2025/2026";
  const { rows: clubRows } = await client.query(
    `INSERT INTO public.clubs (slug, public_name, official_name, settings)
     VALUES ($1, $2, $2, $3::jsonb) RETURNING id`,
    [PILOT.slug, PILOT.name, JSON.stringify({ shortName: PILOT.shortName })],
  );
  const clubId = clubRows[0].id;

  const { rows: teamRows } = await client.query(
    `INSERT INTO public.teams (club_id, name, category, season, is_active)
     VALUES ($1, $2, 'seniors', $3, TRUE) RETURNING id`,
    [clubId, `${PILOT.shortName} Seniorzy`, seasonName],
  );

  await client.query(
    `INSERT INTO public.website_settings (club_id, public_site_enabled, primary_color, secondary_color, accent_color, hero_title, seo_title)
     VALUES ($1, TRUE, $2, $3, $4, $5, $5)`,
    [clubId, PILOT.colors.primary, PILOT.colors.secondary, PILOT.colors.accent, PILOT.name],
  );

  await client.query(
    `INSERT INTO public.content_channels (club_id, channel, is_enabled, auto_queue)
     VALUES ($1, 'website', TRUE, FALSE), ($1, 'facebook', FALSE, FALSE), ($1, 'instagram', FALSE, FALSE)
     ON CONFLICT (club_id, channel) DO NOTHING`,
    [clubId],
  );

  const { rows: seasonRows } = await client.query(
    `INSERT INTO public.league_seasons (club_id, name, is_active, start_date) VALUES ($1, $2, TRUE, CURRENT_DATE) RETURNING id`,
    [clubId, seasonName],
  );
  const { rows: compRows } = await client.query(
    `INSERT INTO public.league_competitions (club_id, season_id, name, is_active) VALUES ($1, $2, 'Liga test', TRUE) RETURNING id`,
    [clubId, seasonRows[0].id],
  );
  await client.query(
    `INSERT INTO public.league_sources (club_id, competition_id, name, adapter, provider_label, is_active, config)
     VALUES ($1, $2, 'Manual / pending sync setup', 'json', 'FC OS Bootstrap', FALSE, '{}'::jsonb)`,
    [clubId, compRows[0].id],
  );

  for (const [code, label, absenceReason] of [
    ["illness", "Choroba", "illness"],
    ["injury", "Kontuzja", "injury"],
    ["school", "Szkoła", "other"],
    ["work", "Praca", "other"],
    ["vacation", "Urlop", "other"],
    ["other", "Inne", "other"],
  ]) {
    await client.query(
      `INSERT INTO public.availability_reasons (club_id, code, label_pl, absence_reason, sort_order)
       SELECT $1, $2, $3, $4::public.absence_reason, COALESCE(MAX(sort_order), 0) + 1
       FROM public.availability_reasons WHERE club_id = $1`,
      [clubId, code, label, absenceReason],
    );
  }

  await client.query(
    `INSERT INTO auth.users (id, email) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [PILOT.ownerId, PILOT.ownerEmail],
  );
  await client.query(
    `INSERT INTO public.profiles (id, email, full_name) VALUES ($1, $2, 'Pilot Owner') ON CONFLICT DO NOTHING`,
    [PILOT.ownerId, PILOT.ownerEmail],
  );
  await client.query(
    `INSERT INTO public.club_memberships (club_id, user_id, role, status) VALUES ($1, $2, 'owner', 'active')`,
    [clubId, PILOT.ownerId],
  );

  return { clubId, teamId: teamRows[0].id, seasonId: seasonRows[0].id, competitionId: compRows[0].id };
}

async function testIsolation(client, pilotClubId) {
  const tests = [];

  async function asUser(userId, sql, params = []) {
    await client.query("BEGIN");
    try {
      await client.query("SET LOCAL ROLE authenticated");
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
      const result = await client.query(sql, params);
      await client.query("COMMIT");
      return result;
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }

  // Pilot owner sees only pilot club (via RLS on memberships)
  const { rows: pilotClubs } = await asUser(
    PILOT.ownerId,
    `SELECT club_id FROM public.club_memberships`,
  );
  tests.push({
    name: "pilot_owner_memberships_scoped",
    pass: pilotClubs.length === 1 && pilotClubs[0].club_id === pilotClubId,
  });

  // Pilot cannot read Piorun players (RLS)
  const { rows: pilotPlayerLeak } = await asUser(
    PILOT.ownerId,
    `SELECT count(*)::int AS c FROM public.players WHERE club_id = $1`,
    [PIORUN_ID],
  );
  tests.push({ name: "pilot_cannot_read_piorun_players", pass: pilotPlayerLeak[0].c === 0 });

  // Public branding readable cross-tenant when public_site_enabled (by design)
  const { rows: publicRead } = await asUser(
    PILOT.piorunOwnerId,
    `SELECT count(*)::int AS c FROM public.website_settings WHERE club_id = $1 AND public_site_enabled = TRUE`,
    [pilotClubId],
  );
  tests.push({
    name: "public_website_settings_readable_cross_tenant",
    pass: publicRead[0].c === 1,
    note: "Expected: website_is_public policy allows authenticated read of public sites",
  });

  // Cross-tenant manage blocked
  let manageBlocked = true;
  try {
    await asUser(
      PILOT.piorunOwnerId,
      `UPDATE public.website_settings SET hero_title = 'hack' WHERE club_id = $1`,
      [pilotClubId],
    );
    manageBlocked = false;
  } catch {
    manageBlocked = true;
  }
  tests.push({ name: "piorun_cannot_manage_pilot_website", pass: manageBlocked });

  // Cross-club slug uniqueness
  const { rows: slugs } = await client.query(`SELECT slug FROM public.clubs ORDER BY slug`);
  tests.push({
    name: "unique_slugs",
    pass: slugs.length === 2 && slugs.map((r) => r.slug).includes(PILOT.slug),
  });

  // Pilot RPC public bundle (service role path — table exists)
  const { rows: rpcCheck } = await client.query(
    `SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_public_website_home'`,
  );
  tests.push({ name: "public_rpc_exists", pass: rpcCheck.length === 1 });

  return tests;
}

async function auditBootstrapArtifacts(client, pilotClubId) {
  const q = async (sql, params) => (await client.query(sql, params)).rows;
  return {
    website_settings: (await q(`SELECT * FROM public.website_settings WHERE club_id=$1`, [pilotClubId])).length,
    content_channels: (await q(`SELECT channel FROM public.content_channels WHERE club_id=$1`, [pilotClubId])).map(
      (r) => r.channel,
    ),
    league_seasons: (await q(`SELECT name FROM public.league_seasons WHERE club_id=$1`, [pilotClubId])).length,
    league_sources: (await q(`SELECT is_active, name FROM public.league_sources WHERE club_id=$1`, [pilotClubId])),
    availability_reasons: (await q(`SELECT count(*)::int c FROM public.availability_reasons WHERE club_id=$1`, [pilotClubId]))[0].c,
    memberships: await q(
      `SELECT role, status FROM public.club_memberships WHERE club_id=$1`,
      [pilotClubId],
    ),
    teams: (await q(`SELECT name FROM public.teams WHERE club_id=$1`, [pilotClubId])).map((r) => r.name),
    website_news: (await q(`SELECT count(*)::int c FROM public.website_news WHERE club_id=$1`, [pilotClubId]))[0].c,
    sponsors: (await q(`SELECT count(*)::int c FROM public.sponsors WHERE club_id=$1`, [pilotClubId]))[0].c,
    gallery_albums: (await q(`SELECT count(*)::int c FROM public.website_gallery_albums WHERE club_id=$1`, [pilotClubId]))[0].c,
    website_social: (await q(`SELECT count(*)::int c FROM public.website_social_integrations WHERE club_id=$1`, [pilotClubId]))[0].c,
  };
}

async function main() {
  const { default: EmbeddedPostgres } = await import("embedded-postgres");
  mkdirSync(dataDir, { recursive: true });
  const ep = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "postgres",
    password: "postgres",
    port: 55436,
    persistent: false,
  });
  await ep.initialise();
  await ep.start();
  const client = ep.getPgClient();
  await client.connect();

  const report = { sprint: "18.0", simulatedAt: new Date().toISOString(), environment: "embedded-pg" };

  try {
    await ensureSupabaseStubs(client);
    await client.query(`
      CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
      $$;
    `);
    await applyBaseline(client);
    await seedPiorun(client);
    const pilot = await bootstrapPilot(client);
    report.pilot = pilot;
    report.artifacts = await auditBootstrapArtifacts(client, pilot.clubId);
    report.isolation = await testIsolation(client, pilot.clubId);
    report.isolationVerdict = report.isolation.every((t) => t.pass) ? "PASS" : "FAIL";
  report.isolationBusinessVerdict =
    report.isolation.filter((t) => t.name !== "public_website_settings_readable_cross_tenant").every((t) => t.pass)
      ? "PASS"
      : "FAIL";

    const { rows: tableCounts } = await client.query(`
      SELECT
        (SELECT count(*) FROM public.clubs) AS clubs,
        (SELECT count(*) FROM public.clubs WHERE slug='pilot-club') AS pilot_exists
    `);
    report.clubCount = Number(tableCounts[0].clubs);

    mkdirSync(docsDir, { recursive: true });
    writeFileSync(join(docsDir, "sprint-180-simulation-results.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await client.end();
    try {
      await ep.stop();
    } catch {
      /* */
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
