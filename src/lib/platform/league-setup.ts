import type pg from "pg";

import { connectServerDb } from "@/lib/db/server-client";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  appendAuditToClubSettings,
  buildPlatformAuditEntry,
  logPlatformAudit,
} from "@/lib/platform/audit";
import {
  mergeValidationResults,
  validateLeagueConfigurationInput,
  validateLeagueDbSnapshot,
  type LeagueConfigInput,
  type LeagueValidationResult,
} from "@/lib/platform/league-config-validation";
import type { LeagueSetupSnapshot } from "@/lib/platform/league-setup-snapshot";
import {
  buildRegiowynikiKadraUrl,
  getLeagueProvider,
  type LeagueProviderId,
} from "@/lib/platform/league-providers";
import type { LeagueSourceAdapter } from "@/types/league";

export type { LeagueSetupSnapshot } from "@/lib/platform/league-setup-snapshot";
export { configInputFromSnapshot } from "@/lib/platform/league-setup-snapshot";

export type SaveLeagueConfigurationParams = LeagueConfigInput & {
  clubId: string;
  actor: { id: string; email: string };
};

export type ActivateLeagueSyncParams = {
  clubId: string;
  actor: { id: string; email: string };
  triggerLiveSync?: boolean;
};

export type ActivateLeagueSyncResult = {
  jobId: string;
  validation: LeagueValidationResult;
  liveSyncTriggered: boolean;
  liveSyncMessage?: string;
};

function buildSourceConfig(input: LeagueConfigInput): Record<string, unknown> {
  const provider = getLeagueProvider(input.providerId);

  if (input.providerId === "manual_import") {
    const adapter = input.manualAdapter === "json" ? "json" : "csv";
    return {
      provider: "manual_import",
      manualAdapter: adapter,
      configuredVia: "platform_league_wizard",
      configuredAt: new Date().toISOString(),
    };
  }

  const regiowynikiKadraUrl =
    input.regiowynikiKadraUrl?.trim() ||
    (input.ownLeagueName ? buildRegiowynikiKadraUrl(input.ownLeagueName) : null);

  const config: Record<string, unknown> = {
    provider: "mirror_live",
    ninetyMinutUrl: input.ninetyMinutUrl?.trim() ?? "",
    regionalnyFutbolUrl: input.regionalnyFutbolUrl?.trim() ?? "",
    regiowynikiKadraUrl: regiowynikiKadraUrl ?? "",
    ownLeagueName: input.ownLeagueName?.trim() ?? "",
    ownDisplayName: input.ownDisplayName?.trim() ?? "",
    sources: [
      input.ninetyMinutUrl?.trim(),
      input.regionalnyFutbolUrl?.trim(),
    ].filter(Boolean),
    configuredVia: "platform_league_wizard",
    configuredAt: new Date().toISOString(),
    cron: "0 6 * * *",
  };

  const token = input.lnpAccessToken?.trim();
  const teamId = input.lnpTeamId?.trim();
  if (token && teamId) {
    config.lnp = {
      accessToken: token,
      teamId,
      seasonId: input.lnpSeasonId?.trim() || null,
      leagueId: input.lnpLeagueId?.trim() || null,
    };
  }

  return config;
}

function detectProviderFromConfig(config: Record<string, unknown>): LeagueProviderId | null {
  const provider = config.provider;
  if (provider === "manual_import") return "manual_import";
  if (provider === "mirror_live" || config.ninetyMinutUrl || config.ninety_minut_url) {
    return "mirror_live";
  }
  if (config.bootstrapped) return null;
  return null;
}

function maskConfigForDisplay(config: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...config };
  if (copy.lnp && typeof copy.lnp === "object") {
    const lnp = { ...(copy.lnp as Record<string, unknown>) };
    if (lnp.accessToken) lnp.accessToken = "••••••••";
    if (lnp.token) lnp.token = "••••••••";
    copy.lnp = lnp;
  }
  return copy;
}

export async function loadLeagueSetupSnapshot(clubId: string): Promise<LeagueSetupSnapshot | null> {
  const admin = createAdminClient();

  const { data: club } = await admin
    .from("clubs")
    .select("id, slug, public_name, status")
    .eq("id", clubId)
    .maybeSingle();

  if (!club) return null;

  const [seasonRes, compRes, sourceRes, teamRes, jobRes] = await Promise.all([
    admin
      .from("league_seasons")
      .select("id, name, is_active")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("league_competitions")
      .select("id, name, season_id, is_active")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("league_sources")
      .select("id, name, is_active, config, last_sync_at, competition_id")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("league_teams")
      .select("id, team_id")
      .eq("club_id", clubId)
      .eq("is_own_club", true)
      .maybeSingle(),
    admin
      .from("league_sync_jobs")
      .select("id, status, records_processed, records_failed, error_message, created_at, completed_at")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const config =
    sourceRes.data?.config && typeof sourceRes.data.config === "object"
      ? (sourceRes.data.config as Record<string, unknown>)
      : {};

  return {
    clubId,
    clubSlug: String(club.slug),
    clubName: String(club.public_name),
    clubExists: true,
    seasonId: seasonRes.data?.id != null ? String(seasonRes.data.id) : null,
    seasonName: seasonRes.data?.name != null ? String(seasonRes.data.name) : null,
    seasonActive: Boolean(seasonRes.data?.is_active),
    competitionId: compRes.data?.id != null ? String(compRes.data.id) : null,
    competitionName: compRes.data?.name != null ? String(compRes.data.name) : null,
    sourceId: sourceRes.data?.id != null ? String(sourceRes.data.id) : null,
    sourceActive: Boolean(sourceRes.data?.is_active),
    sourceName: sourceRes.data?.name != null ? String(sourceRes.data.name) : null,
    hasOwnTeam: Boolean(teamRes.data),
    teamId: teamRes.data?.team_id != null ? String(teamRes.data.team_id) : null,
    providerId: detectProviderFromConfig(config),
    config: maskConfigForDisplay(config),
    lastSyncAt: sourceRes.data?.last_sync_at != null ? String(sourceRes.data.last_sync_at) : null,
    latestJob: jobRes.data
      ? {
          id: String(jobRes.data.id),
          status: String(jobRes.data.status),
          recordsProcessed: Number(jobRes.data.records_processed ?? 0),
          recordsFailed: Number(jobRes.data.records_failed ?? 0),
          errorMessage:
            jobRes.data.error_message != null ? String(jobRes.data.error_message) : null,
          createdAt: String(jobRes.data.created_at),
          completedAt:
            jobRes.data.completed_at != null ? String(jobRes.data.completed_at) : null,
        }
      : null,
    syncConfigured: Boolean(sourceRes.data?.is_active && teamRes.data && compRes.data),
  };
}

export async function validateLeagueConfiguration(
  clubId: string,
  input?: LeagueConfigInput,
  options?: { allowInactiveSource?: boolean },
): Promise<LeagueValidationResult> {
  const snapshot = await loadLeagueSetupSnapshot(clubId);
  if (!snapshot) {
    return {
      verdict: "FAIL",
      checks: [{ code: "club_missing", severity: "fail", message: "Klub nie istnieje." }],
    };
  }

  const results: LeagueValidationResult[] = [];
  if (input) results.push(validateLeagueConfigurationInput(input));
  results.push(validateLeagueDbSnapshot(snapshot, options));
  return mergeValidationResults(...results);
}

async function saveLeagueConfigurationTransaction(
  client: pg.Client,
  params: SaveLeagueConfigurationParams,
): Promise<{ seasonId: string; competitionId: string; sourceId: string }> {
  const validation = validateLeagueConfigurationInput(params);
  if (validation.verdict === "FAIL") {
    throw new Error(validation.checks.find((c) => c.severity === "fail")?.message ?? "Walidacja nie powiodła się.");
  }

  const provider = getLeagueProvider(params.providerId);
  const config = buildSourceConfig(params);
  const adapter: LeagueSourceAdapter =
    params.providerId === "manual_import"
      ? params.manualAdapter === "json"
        ? "json"
        : "csv"
      : provider.adapter;

  const { rows: clubRows } = await client.query(`SELECT id, slug, public_name, settings FROM public.clubs WHERE id = $1`, [
    params.clubId,
  ]);
  if (!clubRows.length) throw new Error("Klub nie istnieje.");

  const club = clubRows[0] as { id: string; slug: string; public_name: string; settings: Record<string, unknown> | null };
  const auditEntry = buildPlatformAuditEntry("league_configuration_saved", params.actor, {
    clubId: params.clubId,
    providerId: params.providerId,
    seasonName: params.seasonName,
    competitionName: params.competitionName,
  });
  const settings = appendAuditToClubSettings(club.settings ?? {}, auditEntry);
  await client.query(`UPDATE public.clubs SET settings = $2::jsonb WHERE id = $1`, [
    params.clubId,
    JSON.stringify(settings),
  ]);

  const { rows: seasonRows } = await client.query(
    `SELECT id FROM public.league_seasons WHERE club_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [params.clubId],
  );

  let seasonId: string;
  if (seasonRows.length) {
    seasonId = String(seasonRows[0]!.id);
    await client.query(
      `UPDATE public.league_seasons SET name = $2, is_active = TRUE, updated_at = NOW() WHERE id = $1 AND club_id = $3`,
      [seasonId, params.seasonName.trim(), params.clubId],
    );
  } else {
    const { rows: inserted } = await client.query(
      `INSERT INTO public.league_seasons (club_id, name, is_active, start_date)
       VALUES ($1, $2, TRUE, CURRENT_DATE) RETURNING id`,
      [params.clubId, params.seasonName.trim()],
    );
    seasonId = String(inserted[0]!.id);
  }

  const { rows: compRows } = await client.query(
    `SELECT id FROM public.league_competitions WHERE club_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [params.clubId],
  );

  let competitionId: string;
  if (compRows.length) {
    competitionId = String(compRows[0]!.id);
    await client.query(
      `UPDATE public.league_competitions
       SET name = $2, season_id = $3, category_label = $4, provider = $5, is_active = TRUE, updated_at = NOW()
       WHERE id = $1 AND club_id = $6`,
      [
        competitionId,
        params.competitionName.trim(),
        seasonId,
        params.categoryLabel?.trim() || null,
        provider.providerLabel,
        params.clubId,
      ],
    );
  } else {
    const { rows: inserted } = await client.query(
      `INSERT INTO public.league_competitions (club_id, season_id, name, category_label, provider, is_active)
       VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
      [
        params.clubId,
        seasonId,
        params.competitionName.trim(),
        params.categoryLabel?.trim() || null,
        provider.providerLabel,
      ],
    );
    competitionId = String(inserted[0]!.id);
  }

  const { rows: sourceRows } = await client.query(
    `SELECT id FROM public.league_sources WHERE club_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [params.clubId],
  );

  let sourceId: string;
  if (sourceRows.length) {
    sourceId = String(sourceRows[0]!.id);
    await client.query(
      `UPDATE public.league_sources
       SET competition_id = $2, name = $3, adapter = $4::public.league_source_adapter,
           provider_label = $5, is_active = FALSE, config = $6::jsonb, updated_at = NOW()
       WHERE id = $1 AND club_id = $7`,
      [
        sourceId,
        competitionId,
        provider.sourceName,
        adapter,
        provider.providerLabel,
        JSON.stringify(config),
        params.clubId,
      ],
    );
  } else {
    const { rows: inserted } = await client.query(
      `INSERT INTO public.league_sources (club_id, competition_id, name, adapter, provider_label, is_active, config)
       VALUES ($1, $2, $3, $4::public.league_source_adapter, $5, FALSE, $6::jsonb) RETURNING id`,
      [
        params.clubId,
        competitionId,
        provider.sourceName,
        adapter,
        provider.providerLabel,
        JSON.stringify(config),
      ],
    );
    sourceId = String(inserted[0]!.id);
  }

  if (params.providerId === "mirror_live" && params.ownLeagueName && params.ownDisplayName) {
    const { rows: teamModule } = await client.query(
      `SELECT id FROM public.teams WHERE club_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
      [params.clubId],
    );
    const moduleTeamId = teamModule[0]?.id ?? null;
    const leagueName = params.ownLeagueName.trim();
    const displayName = params.ownDisplayName.trim();

    await client.query(
      `INSERT INTO public.league_teams (
         club_id, competition_id, team_id, display_name, league_name, is_own_club, provider
       ) VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       ON CONFLICT (club_id, competition_id, league_name)
       DO UPDATE SET display_name = EXCLUDED.display_name, team_id = EXCLUDED.team_id, is_own_club = TRUE, updated_at = NOW()`,
      [params.clubId, competitionId, moduleTeamId, displayName, leagueName, provider.providerLabel],
    );
  } else if (params.providerId === "manual_import") {
    const { rows: teamModule } = await client.query(
      `SELECT id FROM public.teams WHERE club_id = $1 AND is_active = TRUE ORDER BY created_at ASC LIMIT 1`,
      [params.clubId],
    );
    const moduleTeamId = teamModule[0]?.id ?? null;
    const displayName = club.public_name;
    const leagueName = params.competitionName.trim();

    await client.query(
      `INSERT INTO public.league_teams (
         club_id, competition_id, team_id, display_name, league_name, is_own_club, provider
       ) VALUES ($1, $2, $3, $4, $5, TRUE, $6)
       ON CONFLICT (club_id, competition_id, league_name)
       DO UPDATE SET display_name = EXCLUDED.display_name, team_id = EXCLUDED.team_id, is_own_club = TRUE, updated_at = NOW()`,
      [params.clubId, competitionId, moduleTeamId, displayName, leagueName, provider.providerLabel],
    );
  }

  return { seasonId, competitionId, sourceId };
}

export async function saveLeagueConfiguration(
  params: SaveLeagueConfigurationParams,
): Promise<{ seasonId: string; competitionId: string; sourceId: string }> {
  const client = await connectServerDb();
  try {
    await client.query("BEGIN");
    const result = await saveLeagueConfigurationTransaction(client, params);
    await client.query("COMMIT");
    logPlatformAudit(
      buildPlatformAuditEntry("league_configuration_saved", params.actor, {
        clubId: params.clubId,
        ...result,
      }),
    );
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }
}

export async function activateLeagueSync(params: ActivateLeagueSyncParams): Promise<ActivateLeagueSyncResult> {
  const snapshot = await loadLeagueSetupSnapshot(params.clubId);
  if (!snapshot) throw new Error("Klub nie istnieje.");

  const validation = await validateLeagueConfiguration(params.clubId, undefined, {
    allowInactiveSource: true,
  });
  if (validation.verdict === "FAIL") {
    const reason = validation.checks.find((c) => c.severity === "fail")?.message ?? "Konfiguracja niekompletna.";
    throw new Error(reason);
  }

  const client = await connectServerDb();
  let jobId: string;

  try {
    await client.query("BEGIN");

    const { rows: sourceRows } = await client.query(
      `SELECT id, competition_id FROM public.league_sources WHERE club_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [params.clubId],
    );
    if (!sourceRows.length) throw new Error("Brak źródła danych — zapisz konfigurację najpierw.");

    const sourceId = String(sourceRows[0]!.id);
    const competitionId = String(sourceRows[0]!.competition_id);

    await client.query(
      `UPDATE public.league_sources SET is_active = TRUE, updated_at = NOW() WHERE id = $1 AND club_id = $2`,
      [sourceId, params.clubId],
    );

    const { rows: jobRows } = await client.query(
      `INSERT INTO public.league_sync_jobs (club_id, source_id, competition_id, import_type, status, triggered_by, metadata)
       VALUES ($1, $2, $3, 'full', 'pending', $4, $5::jsonb)
       RETURNING id`,
      [
        params.clubId,
        sourceId,
        competitionId,
        params.actor.id,
        JSON.stringify({ activatedVia: "platform_league_wizard", actorEmail: params.actor.email }),
      ],
    );
    jobId = String(jobRows[0]!.id);

    const { rows: clubRows } = await client.query(`SELECT settings FROM public.clubs WHERE id = $1`, [params.clubId]);
    const auditEntry = buildPlatformAuditEntry("league_sync_activated", params.actor, {
      clubId: params.clubId,
      sourceId,
      jobId,
    });
    const settings = appendAuditToClubSettings(
      (clubRows[0]?.settings as Record<string, unknown>) ?? {},
      auditEntry,
    );
    await client.query(`UPDATE public.clubs SET settings = $2::jsonb WHERE id = $1`, [
      params.clubId,
      JSON.stringify(settings),
    ]);

    await client.query("COMMIT");
    logPlatformAudit(auditEntry);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    await client.end();
  }

  const liveSyncTriggered = false;
  let liveSyncMessage: string | undefined;

  if (params.triggerLiveSync !== false) {
    const snapshotAfter = await loadLeagueSetupSnapshot(params.clubId);
    if (snapshotAfter?.providerId === "mirror_live") {
      liveSyncMessage =
        "Sync aktywowany. Pierwsze pobranie danych uruchom przez przycisk „Uruchom live sync” lub poczekaj na cron (06:00 UTC).";
    } else {
      liveSyncMessage = "Sync aktywowany. Prześlij pierwszy plik w panelu klubu (Liga → Import).";
    }
  }

  return { jobId, validation, liveSyncTriggered, liveSyncMessage };
}
