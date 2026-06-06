import type pg from "pg";

import { connectServerDb } from "@/lib/db/server-client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appendAuditToClubSettings,
  buildPlatformAuditEntry,
  logPlatformAudit,
  type PlatformAuditEntry,
} from "@/lib/platform/audit";
import { defaultSeasonLabel } from "@/lib/platform/slug";

export type ClubBootstrapColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type ClubBootstrapInput = {
  slug: string;
  publicName: string;
  shortName: string;
  officialName?: string;
  competitionLevel?: string;
  voivodeship?: string;
  colors: ClubBootstrapColors;
  ownerEmail: string;
  seasonName?: string;
  leagueName?: string;
  isTest?: boolean;
  actor: { id: string; email: string };
};

export type ClubBootstrapResult = {
  clubId: string;
  teamId: string;
  seasonId: string;
  competitionId: string;
  ownerUserId: string | null;
  slug: string;
  publicName: string;
};

const DEFAULT_REASONS: Array<[string, string, string]> = [
  ["illness", "Choroba", "illness"],
  ["injury", "Kontuzja", "injury"],
  ["school", "Szkoła", "other"],
  ["work", "Praca", "other"],
  ["vacation", "Urlop", "other"],
  ["other", "Inne", "other"],
];

async function ensureOwnerViaAuth(
  ownerEmail: string,
  clubId: string,
): Promise<string> {
  const admin = createAdminClient();
  const normalized = ownerEmail.trim().toLowerCase();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .ilike("email", normalized)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  if (profile?.id) {
    const userId = String(profile.id);
    await admin.from("club_memberships").upsert(
      { club_id: clubId, user_id: userId, role: "owner", status: "active" },
      { onConflict: "club_id,user_id,role" },
    );
    return userId;
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(normalized, {
    data: { full_name: "Club Owner" },
  });
  if (error || !data.user) throw new Error(`Zaproszenie właściciela nie powiodło się: ${error?.message ?? "unknown"}`);

  await admin.from("club_memberships").upsert(
    { club_id: clubId, user_id: data.user.id, role: "owner", status: "invited" },
    { onConflict: "club_id,user_id,role" },
  );
  return data.user.id;
}

async function bootstrapClubTransaction(
  client: pg.Client,
  input: ClubBootstrapInput,
  auditEntry: PlatformAuditEntry,
): Promise<Omit<ClubBootstrapResult, "ownerUserId"> & { ownerUserId: string | null }> {
  const seasonName = input.seasonName ?? defaultSeasonLabel();
  const leagueName = input.leagueName ?? "Liga — do konfiguracji";
  const settings = appendAuditToClubSettings(
    {
      shortName: input.shortName,
      bootstrappedAt: new Date().toISOString(),
      bootstrappedVia: "platform_wizard",
      ...(input.isTest ? { isTest: true } : {}),
    },
    auditEntry,
  );

  await client.query("BEGIN");

  try {
    const { rows: existingSlug } = await client.query(
      `SELECT id FROM public.clubs WHERE slug = $1 LIMIT 1`,
      [input.slug],
    );
    if (existingSlug.length > 0) {
      throw new Error(`Slug "${input.slug}" jest już zajęty.`);
    }

    const { rows: clubRows } = await client.query(
      `INSERT INTO public.clubs (slug, public_name, official_name, competition_level, voivodeship, status, settings)
       VALUES ($1, $2, $3, $4, $5, 'onboarding', $6::jsonb)
       RETURNING id`,
      [
        input.slug,
        input.publicName,
        input.officialName ?? input.publicName,
        input.competitionLevel ?? null,
        input.voivodeship ?? null,
        JSON.stringify(settings),
      ],
    );
    const clubId = String(clubRows[0]!.id);

    const { rows: teamRows } = await client.query(
      `INSERT INTO public.teams (club_id, name, category, season, is_active)
       VALUES ($1, $2, 'seniors', $3, TRUE)
       RETURNING id`,
      [clubId, `${input.shortName} Seniorzy`, seasonName],
    );
    const teamId = String(teamRows[0]!.id);

    await client.query(
      `INSERT INTO public.website_settings (
         club_id, public_site_enabled, primary_color, secondary_color, accent_color,
         hero_title, seo_title, seo_description
       ) VALUES ($1, TRUE, $2, $3, $4, $5, $5, $6)`,
      [
        clubId,
        input.colors.primary,
        input.colors.secondary,
        input.colors.accent,
        input.publicName,
        `${input.publicName} — oficjalna strona klubu`,
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
    const seasonId = String(seasonRows[0]!.id);

    const { rows: compRows } = await client.query(
      `INSERT INTO public.league_competitions (club_id, season_id, name, is_active)
       VALUES ($1, $2, $3, TRUE)
       RETURNING id`,
      [clubId, seasonId, leagueName],
    );
    const competitionId = String(compRows[0]!.id);

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

    for (const [code, label, absenceReason] of DEFAULT_REASONS) {
      await client.query(
        `INSERT INTO public.availability_reasons (club_id, code, label_pl, absence_reason, sort_order)
         VALUES ($1, $2, $3, $4::public.absence_reason, (
           SELECT COALESCE(MAX(sort_order), 0) + 1 FROM public.availability_reasons WHERE club_id = $1
         ))
         ON CONFLICT (club_id, code) DO NOTHING`,
        [clubId, code, label, absenceReason],
      );
    }

    let ownerUserId: string | null = null;
    const { rows: profileRows } = await client.query(
      `SELECT id FROM public.profiles WHERE lower(email) = lower($1) LIMIT 1`,
      [input.ownerEmail],
    );

    if (profileRows.length > 0) {
      ownerUserId = String(profileRows[0]!.id);
      await client.query(
        `INSERT INTO public.club_memberships (club_id, user_id, role, status)
         VALUES ($1, $2, 'owner', 'active')
         ON CONFLICT (club_id, user_id, role) DO UPDATE SET status = 'active'`,
        [clubId, ownerUserId],
      );
    }

    await client.query("COMMIT");

    return {
      clubId,
      teamId,
      seasonId,
      competitionId,
      slug: input.slug,
      publicName: input.publicName,
      ownerUserId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

export async function createClub(input: ClubBootstrapInput): Promise<ClubBootstrapResult> {
  const auditEntry = buildPlatformAuditEntry("club_created", input.actor, {
    slug: input.slug,
    publicName: input.publicName,
    ownerEmail: input.ownerEmail,
  });
  logPlatformAudit(auditEntry);

  const client = await connectServerDb();
  try {
    const txResult = await bootstrapClubTransaction(client, input, auditEntry);
    let ownerUserId = txResult.ownerUserId;
    if (!ownerUserId) {
      ownerUserId = await ensureOwnerViaAuth(input.ownerEmail, txResult.clubId);
    }

    return { ...txResult, ownerUserId };
  } finally {
    await client.end();
  }
}
