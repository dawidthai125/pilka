import { createAdminClient } from "@/lib/supabase/admin";
import { isTestClub, parseClubSettings } from "@/lib/platform/club-test";
import {
  computeClubHealthRows,
  loadHealthMetricsContext,
  type ClubHealthRow,
  type HealthLevel,
} from "@/lib/platform/health";

export type ClubOperationsRegistryRow = {
  id: string;
  slug: string;
  publicName: string;
  status: string;
  createdAt: string;
  ownerEmail: string | null;
  ownerStatus: string | null;
  healthScore: number;
  healthLevel: HealthLevel;
  lastSyncAt: string | null;
  leagueLabel: string;
  isTest: boolean;
  requiresAttention: boolean;
};

function detectProviderLabel(config: Record<string, unknown>): string {
  if (config.provider === "manual_import") return "Import ręczny";
  if (config.provider === "mirror_live" || config.ninetyMinutUrl || config.ninety_minut_url) {
    return "Mirror Live";
  }
  return "Liga";
}

function formatLeagueLabel(
  sources: Array<{ name: string; is_active: boolean; config: unknown }>,
): string {
  if (sources.length === 0) return "—";
  const active = sources.filter((s) => s.is_active);
  const primary = active[0] ?? sources[0]!;
  const config =
    primary.config && typeof primary.config === "object"
      ? (primary.config as Record<string, unknown>)
      : {};
  const provider = detectProviderLabel(config);
  const suffix = active.length === 0 ? " (nieaktywne)" : "";
  return `${provider} · ${primary.name}${suffix}`;
}

async function loadOwnerByClubId(clubIds: string[]): Promise<
  Map<string, { email: string | null; status: string | null }>
> {
  const map = new Map<string, { email: string | null; status: string | null }>();
  if (clubIds.length === 0) return map;

  const admin = createAdminClient();
  const { data: memberships, error } = await admin
    .from("club_memberships")
    .select("club_id, status, user_id")
    .eq("role", "owner")
    .in("club_id", clubIds);

  if (error) throw new Error(error.message);

  const userIds = [
    ...new Set(
      (memberships ?? [])
        .map((m) => (m.user_id != null ? String(m.user_id) : null))
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const profileByUserId = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    if (profileError) throw new Error(profileError.message);
    for (const profile of profiles ?? []) {
      profileByUserId.set(String(profile.id), String(profile.email));
    }
  }

  for (const membership of memberships ?? []) {
    const clubId = String(membership.club_id);
    const userId = membership.user_id != null ? String(membership.user_id) : null;
    map.set(clubId, {
      email: userId ? (profileByUserId.get(userId) ?? null) : null,
      status: membership.status != null ? String(membership.status) : null,
    });
  }

  return map;
}

function mergeRow(
  health: ClubHealthRow,
  createdAt: string,
  owner: { email: string | null; status: string | null },
  leagueLabel: string,
  settings: Record<string, unknown> | null,
): ClubOperationsRegistryRow {
  const test = isTestClub(health.slug, settings);
  const requiresAttention =
    !test &&
    health.status !== "archived" &&
    (health.level === "WARNING" || health.level === "CRITICAL");

  return {
    id: health.clubId,
    slug: health.slug,
    publicName: health.publicName,
    status: health.status,
    createdAt,
    ownerEmail: owner.email,
    ownerStatus: owner.status,
    healthScore: health.score,
    healthLevel: health.level,
    lastSyncAt: health.lastSyncAt,
    leagueLabel,
    isTest: test,
    requiresAttention,
  };
}

/**
 * Jedno ładowanie kontekstu Health v2 + health rows + bulk owners (bez N+1 per klub).
 */
export async function loadClubOperationsRegistry(): Promise<ClubOperationsRegistryRow[]> {
  const ctx = await loadHealthMetricsContext();
  const healthRows = await computeClubHealthRows(ctx);
  const healthByClubId = new Map(healthRows.map((row) => [row.clubId, row]));
  const createdAtByClubId = new Map(ctx.clubs.map((c) => [String(c.id), String(c.created_at)]));
  const owners = await loadOwnerByClubId(ctx.clubs.map((c) => String(c.id)));

  const rows: ClubOperationsRegistryRow[] = [];

  for (const club of ctx.clubs) {
    const clubId = String(club.id);
    const health = healthByClubId.get(clubId);
    if (!health) continue;

    const sources = ctx.sourcesByClubId.get(clubId) ?? [];
    rows.push(
      mergeRow(
        health,
        createdAtByClubId.get(clubId) ?? club.created_at,
        owners.get(clubId) ?? { email: null, status: null },
        formatLeagueLabel(sources),
        parseClubSettings(club.settings),
      ),
    );
  }

  return rows.sort((a, b) => a.publicName.localeCompare(b.publicName, "pl"));
}

export type ClubOperationsRegistryQueryStats = {
  healthContextLoads: 1;
  ownerBulkQueries: 2;
  usesExistingHealthComputation: true;
};

export function clubOperationsRegistryQueryStats(): ClubOperationsRegistryQueryStats {
  return {
    healthContextLoads: 1,
    ownerBulkQueries: 2,
    usesExistingHealthComputation: true,
  };
}
