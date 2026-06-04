#!/usr/bin/env node
/**
 * FC OS — generic club bootstrap (Sprint 17.3 design)
 *
 * Prerequisites:
 *   1. Empty Supabase project with supabase/baseline.sql applied
 *   2. .env.local with NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_PASSWORD
 *
 * Usage:
 *   node scripts/bootstrap-club.mjs \
 *     --slug my-club \
 *     --name "My Football Club" \
 *     --short-name "MFC" \
 *     --colors "#1e3a5f,#f5c518,#ffffff" \
 *     --owner-email owner@example.com
 *
 * Optional:
 *   --official-name "Official legal name"
 *   --competition-level "B Klasa"
 *   --voivodeship "dolnośląskie"
 *   --season "2025/2026"
 *   --league-name "Regional League VII"
 *   --dry-run
 *
 * Does NOT run league sync — only prepares league_seasons / league_competitions / league_sources skeleton.
 */

import { parseArgs } from "node:util";
import dotenv from "dotenv";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { connectDb } from "./lib/db-client.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: join(root, ".env.local") });

const { values: args, positionals } = parseArgs({
  options: {
    slug: { type: "string" },
    name: { type: "string" },
    "short-name": { type: "string" },
    colors: { type: "string" },
    "owner-email": { type: "string" },
    "official-name": { type: "string" },
    "competition-level": { type: "string" },
    voivodeship: { type: "string" },
    season: { type: "string" },
    "league-name": { type: "string" },
    "dry-run": { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  allowPositionals: true,
});

function usage() {
  console.log(`FC OS club bootstrap

Required:
  --slug              URL slug (unique, lowercase, hyphens)
  --name              Public display name
  --short-name        Abbreviation for UI
  --colors            primary,secondary,accent hex (comma-separated)
  --owner-email       Email of club owner (must exist in auth or will be invited)

Optional:
  --official-name     Legal / association name
  --competition-level e.g. "B Klasa"
  --voivodeship       e.g. "dolnośląskie"
  --season            Active season label (default: current school year)
  --league-name       Competition name for league hub skeleton
  --dry-run           Print planned actions without writing

Steps performed:
  1. Create club row (gen_random_uuid — no hardcoded UUID)
  2. Create default senior team
  3. Create website_settings with branding colors
  4. Create default content_channels (website, social placeholders)
  5. Create league_season + league_competition + empty league_sources config
  6. Invite / link owner membership (role: owner)
  7. Seed availability_reasons catalog for club

NOT performed (manual / later):
  - League sync (npm run sync:league-live)
  - Media upload
  - Auth redirect URL configuration
  - Vercel ENV (PUBLIC_CLUB_SLUG)
  - Demo players / coaches
`);
}

function requireArg(name, value) {
  if (!value?.trim()) {
    console.error(`Missing required argument: --${name}`);
    usage();
    process.exit(1);
  }
  return value.trim();
}

function parseColors(raw) {
  const parts = raw.split(",").map((s) => s.trim());
  if (parts.length !== 3 || parts.some((c) => !/^#[0-9a-fA-F]{6}$/.test(c))) {
    throw new Error("--colors must be three hex values: #primary,#secondary,#accent");
  }
  return { primary: parts[0], secondary: parts[1], accent: parts[2] };
}

function defaultSeason() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}

function slugify(input) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** @typedef {{ clubId: string, teamId: string, seasonId: string, competitionId: string, ownerUserId: string | null }} BootstrapResult */

/**
 * @param {import("pg").Client} client
 * @param {object} config
 * @returns {Promise<BootstrapResult>}
 */
async function bootstrapClub(client, config) {
  const {
    slug,
    publicName,
    shortName,
    officialName,
    competitionLevel,
    voivodeship,
    colors,
    ownerEmail,
    seasonName,
    leagueName,
    dryRun,
  } = config;

  const plan = {
    slug,
    publicName,
    shortName,
    ownerEmail,
    seasonName,
    leagueName,
    colors,
  };

  if (dryRun) {
    console.log("DRY RUN — planned bootstrap:\n", JSON.stringify(plan, null, 2));
    return {
      clubId: "(dry-run)",
      teamId: "(dry-run)",
      seasonId: "(dry-run)",
      competitionId: "(dry-run)",
      ownerUserId: null,
    };
  }

  await client.query("BEGIN");

  try {
    const { rows: clubRows } = await client.query(
      `INSERT INTO public.clubs (slug, public_name, official_name, competition_level, voivodeship, settings)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id`,
      [
        slug,
        publicName,
        officialName ?? publicName,
        competitionLevel ?? null,
        voivodeship ?? null,
        JSON.stringify({ shortName, bootstrappedAt: new Date().toISOString() }),
      ],
    );
    const clubId = clubRows[0].id;

    const { rows: teamRows } = await client.query(
      `INSERT INTO public.teams (club_id, name, category, season, is_active)
       VALUES ($1, $2, 'seniors', $3, TRUE)
       RETURNING id`,
      [clubId, `${shortName} Seniorzy`, seasonName],
    );
    const teamId = teamRows[0].id;

    await client.query(
      `INSERT INTO public.website_settings (
         club_id, public_site_enabled, primary_color, secondary_color, accent_color,
         hero_title, seo_title, seo_description
       ) VALUES ($1, TRUE, $2, $3, $4, $5, $5, $6)`,
      [
        clubId,
        colors.primary,
        colors.secondary,
        colors.accent,
        publicName,
        `${publicName} — oficjalna strona klubu`,
      ],
    );

    await client.query(
      `INSERT INTO public.content_channels (club_id, channel, is_enabled, auto_queue)
       VALUES
         ($1, 'website', TRUE, FALSE),
         ($1, 'facebook', FALSE, FALSE),
         ($1, 'instagram', FALSE, FALSE)
       ON CONFLICT (club_id, channel) DO NOTHING`,
      [clubId],
    );

    const { rows: seasonRows } = await client.query(
      `INSERT INTO public.league_seasons (club_id, name, is_active, start_date)
       VALUES ($1, $2, TRUE, CURRENT_DATE)
       RETURNING id`,
      [clubId, seasonName],
    );
    const seasonId = seasonRows[0].id;

    const { rows: compRows } = await client.query(
      `INSERT INTO public.league_competitions (club_id, season_id, name, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id`,
      [clubId, seasonId, leagueName],
    );
    const competitionId = compRows[0].id;

    await client.query(
      `INSERT INTO public.league_sources (
         club_id, competition_id, name, adapter, provider_label, is_active, config
       ) VALUES (
         $1, $2, 'Manual / pending sync setup', 'json', 'FC OS Bootstrap', FALSE,
         $3::jsonb
       )`,
      [
        clubId,
        competitionId,
        JSON.stringify({
          note: "Configure sources via dashboard or scripts/discover-lnp-setup.mjs before enabling sync",
          bootstrapped: true,
        }),
      ],
    );

    const defaultReasons = [
      ["illness", "Choroba", "illness"],
      ["injury", "Kontuzja", "injury"],
      ["school", "Szkoła", "other"],
      ["work", "Praca", "other"],
      ["vacation", "Urlop", "other"],
      ["other", "Inne", "other"],
    ];
    for (const [code, label, absenceReason] of defaultReasons) {
      await client.query(
        `INSERT INTO public.availability_reasons (club_id, code, label_pl, absence_reason, sort_order)
         VALUES ($1, $2, $3, $4::public.absence_reason, (
           SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.availability_reasons WHERE club_id = $1
         ))
         ON CONFLICT (club_id, code) DO NOTHING`,
        [clubId, code, label, absenceReason],
      );
    }

    let ownerUserId = null;
    const { rows: profileRows } = await client.query(
      `SELECT id FROM public.profiles WHERE lower(email) = lower($1) LIMIT 1`,
      [ownerEmail],
    );

    if (profileRows.length > 0) {
      ownerUserId = profileRows[0].id;
      await client.query(
        `INSERT INTO public.club_memberships (club_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (club_id, user_id, role) DO UPDATE SET status = 'active'`,
        [clubId, ownerUserId],
      );
    }

    await client.query("COMMIT");

    return { clubId, teamId, seasonId, competitionId, ownerUserId };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function ensureOwnerViaAuth(admin, ownerEmail, clubId) {
  const { data: listed } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const existing = listed?.users?.find((u) => u.email?.toLowerCase() === ownerEmail.toLowerCase());

  if (existing) {
    await admin.from("club_memberships").upsert(
      { club_id: clubId, user_id: existing.id, role: "owner", status: "active" },
      { onConflict: "club_id,user_id,role" },
    );
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(ownerEmail, {
    data: { full_name: "Club Owner" },
  });
  if (error) throw new Error(`Owner invite failed: ${error.message}`);

  await admin.from("club_memberships").upsert(
    { club_id: clubId, user_id: data.user.id, role: "owner", status: "invited" },
    { onConflict: "club_id,user_id,role" },
  );
  return data.user.id;
}

async function main() {
  if (args.help || positionals.includes("help")) {
    usage();
    return;
  }

  const slug = slugify(requireArg("slug", args.slug));
  const publicName = requireArg("name", args.name);
  const shortName = requireArg("short-name", args["short-name"]);
  const colors = parseColors(requireArg("colors", args.colors));
  const ownerEmail = requireArg("owner-email", args["owner-email"]);
  const seasonName = args.season?.trim() || defaultSeason();
  const leagueName = args["league-name"]?.trim() || "Liga — do konfiguracji";

  const config = {
    slug,
    publicName,
    shortName,
    officialName: args["official-name"]?.trim(),
    competitionLevel: args["competition-level"]?.trim(),
    voivodeship: args.voivodeship?.trim(),
    colors,
    ownerEmail,
    seasonName,
    leagueName,
    dryRun: args["dry-run"] ?? false,
  };

  if (config.dryRun) {
    await bootstrapClub(null, config);
    return;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const client = await connectDb();
  let result;
  try {
    result = await bootstrapClub(client, config);
  } finally {
    await client.end();
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let ownerUserId = result.ownerUserId;
  if (!ownerUserId) {
    ownerUserId = await ensureOwnerViaAuth(admin, ownerEmail, result.clubId);
  }

  console.log("\n✅ Club bootstrapped successfully\n");
  console.log(JSON.stringify({ ...result, ownerUserId, slug, publicName }, null, 2));
  console.log(`
Next steps (manual):
  1. Set PUBLIC_CLUB_SLUG=${slug} in Vercel / .env.local
  2. Configure league_sources.config (dashboard or discover-lnp-setup.mjs)
  3. Enable league_sources.is_active when ready
  4. Run: npm run sync:league-live (when sync configured)
  5. Upload logo via /website/branding
  6. Configure Supabase Auth redirect URLs for production domain
`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
