import { createAdminClient } from "@/lib/supabase/admin";
import { isTestClub, parseClubSettings } from "@/lib/platform/club-test";
import type { ClubOnboardingStatus } from "@/lib/platform/onboarding-status";
import { parsePlatformAuditFromSettings } from "@/lib/platform/audit";
import {
  computeClubHealthRows,
  computeLeagueHealthRows,
  loadHealthMetricsContext,
  platformHealthSummaryFromRows,
  type ClubHealthRow,
  type HealthLevel,
  type HealthMetricsContext,
  type PlatformHealthSummary,
} from "@/lib/platform/health";
import {
  buildSyncMonitoringData,
  type SyncClubLookupEntry,
} from "@/lib/platform/monitoring";
import { evaluatePlatformAlerts, type PlatformAlert } from "@/lib/platform/platform-alerts";
import { PLATFORM_AUDIT_ACTION_LABELS } from "@/lib/platform/platform-audit-actions";

export type PlatformDashboardKpi = {
  totalClubs: number;
  activeClubs: number;
  onboardingClubs: number;
  activeLeagues: number;
  testClubs: number;
  cronStatus: string;
};

export type DashboardPendingOwnerRow = {
  clubId: string;
  slug: string;
  publicName: string;
  ownerEmail: string | null;
  daysPending: number;
  ownerStatus: string;
};

export type ClubAttentionRow = {
  id: string;
  slug: string;
  publicName: string;
  status: string;
  healthScore: number;
  healthLevel: HealthLevel;
  mainProblem: string;
};

export type DashboardTopAlertRow = {
  severity: PlatformAlert["severity"];
  title: string;
  description: string;
  clubId: string | null;
  monitoringHref: string;
};

export type DashboardOnboardingAttentionRow = {
  id: string;
  slug: string;
  publicName: string;
  createdAt: string;
  overall: string;
  missingSteps: string[];
};

export type PlatformRecentSyncRow = {
  jobId: string;
  clubId: string;
  clubSlug: string;
  clubName: string;
  status: string;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage: string | null;
  createdAt: string;
};

export type PlatformRecentActionRow = {
  action: string;
  at: string;
  actorEmail: string;
  clubSlug: string | null;
  metadata?: Record<string, unknown>;
};

export type PlatformDashboardData = {
  kpi: PlatformDashboardKpi;
  platformHealth: PlatformHealthSummary;
  clubsRequiringAttention: ClubAttentionRow[];
  topAlerts: DashboardTopAlertRow[];
  pendingOwnerInvites: DashboardPendingOwnerRow[];
  failedRecentSyncs: PlatformRecentSyncRow[];
  onboardingNeedingAction: DashboardOnboardingAttentionRow[];
  recentSyncs: PlatformRecentSyncRow[];
  recentActions: PlatformRecentActionRow[];
};

export { PLATFORM_AUDIT_ACTION_LABELS };

const DASHBOARD_SYNC_JOB_LIMIT = 50;
const DASHBOARD_RECENT_SYNC_LIMIT = 5;
const DASHBOARD_RECENT_ACTION_LIMIT = 5;
const DASHBOARD_ONBOARDING_LIMIT = 5;
const DASHBOARD_PENDING_OWNER_LIMIT = 10;

const ONBOARDING_STEP_LABELS: Record<
  keyof Omit<ClubOnboardingStatus, "overall">,
  string
> = {
  branding: "Branding",
  website: "Strona publiczna",
  league: "Konfiguracja ligi",
  owner: "Właściciel",
  media: "Media",
};

function missingOnboardingSteps(onboarding: ClubOnboardingStatus): string[] {
  const keys = ["branding", "website", "league", "owner", "media"] as const;
  return keys.filter((k) => onboarding[k] !== "complete").map((k) => ONBOARDING_STEP_LABELS[k]);
}

function mainProblemForClub(
  health: ClubHealthRow,
  onboarding: ClubOnboardingStatus | undefined,
): string {
  if (health.status === "onboarding" && onboarding && onboarding.overall !== "complete") {
    const missing = missingOnboardingSteps(onboarding);
    if (missing.length > 0) return `Brakuje: ${missing.join(", ")}`;
    return "Onboarding w toku";
  }
  const factor = health.factors.find((f) => f !== "Brak problemów");
  if (factor) return factor;
  if (health.recentFailedSyncs > 0) {
    return `${health.recentFailedSyncs} nieudanych sync (7 dni)`;
  }
  return health.level === "CRITICAL" ? "Stan krytyczny synchronizacji" : "Wymaga weryfikacji";
}

function buildClubsRequiringAttention(
  clubHealth: ClubHealthRow[],
  ctx: HealthMetricsContext,
): ClubAttentionRow[] {
  const candidates: { row: ClubAttentionRow; rank: number; score: number }[] = [];

  for (const health of clubHealth) {
    if (health.status === "archived") continue;
    const clubRecord = ctx.clubs.find((c) => String(c.id) === health.clubId);
    if (isTestClub(health.slug, parseClubSettings(clubRecord?.settings))) continue;
    const onboarding = ctx.onboardingByClubId.get(health.clubId);

    let rank: number | null = null;
    if (health.level === "CRITICAL") rank = 0;
    else if (health.level === "WARNING") rank = 1;
    else if (health.status === "onboarding" && onboarding?.overall !== "complete") rank = 2;

    if (rank == null) continue;

    candidates.push({
      rank,
      score: health.score,
      row: {
        id: health.clubId,
        slug: health.slug,
        publicName: health.publicName,
        status: health.status,
        healthScore: health.score,
        healthLevel: health.level,
        mainProblem: mainProblemForClub(health, onboarding),
      },
    });
  }

  return candidates
    .sort((a, b) => a.rank - b.rank || a.score - b.score)
    .slice(0, 10)
    .map((c) => c.row);
}

function countTestClubs(ctx: HealthMetricsContext): number {
  return ctx.clubs.filter((club) =>
    isTestClub(String(club.slug), parseClubSettings(club.settings as Record<string, unknown> | null)),
  ).length;
}

async function buildPendingOwnerInvites(
  ctx: HealthMetricsContext,
): Promise<DashboardPendingOwnerRow[]> {
  const admin = createAdminClient();
  const eligibleClubIds = ctx.clubs
    .filter((c) => c.status !== "archived")
    .filter(
      (c) => !isTestClub(String(c.slug), parseClubSettings(c.settings as Record<string, unknown> | null)),
    )
    .map((c) => String(c.id));

  if (eligibleClubIds.length === 0) return [];

  const { data: memberships, error } = await admin
    .from("club_memberships")
    .select("club_id, status, created_at, user_id")
    .eq("role", "owner")
    .eq("status", "invited")
    .in("club_id", eligibleClubIds);

  if (error) throw new Error(error.message);
  if (!memberships?.length) return [];

  const userIds = [
    ...new Set(
      memberships
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
      profileByUserId.set(String(profile.id), String(profile.email ?? ""));
    }
  }

  const clubById = new Map(ctx.clubs.map((c) => [String(c.id), c]));
  const now = Date.now();

  return memberships
    .map((membership) => {
      const clubId = String(membership.club_id);
      const club = clubById.get(clubId);
      if (!club) return null;
      const createdAt = new Date(String(membership.created_at)).getTime();
      const daysPending = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));
      return {
        clubId,
        slug: String(club.slug),
        publicName: String(club.public_name),
        ownerEmail: profileByUserId.get(String(membership.user_id)) ?? null,
        daysPending,
        ownerStatus: String(membership.status),
      };
    })
    .filter((row): row is DashboardPendingOwnerRow => row != null)
    .sort((a, b) => b.daysPending - a.daysPending)
    .slice(0, DASHBOARD_PENDING_OWNER_LIMIT);
}

function buildTopAlerts(alerts: PlatformAlert[]): DashboardTopAlertRow[] {
  return alerts.slice(0, 5).map((alert) => ({
    severity: alert.severity,
    title: alert.title,
    description: alert.description,
    clubId: alert.clubId,
    monitoringHref: alert.clubId
      ? `/platform/monitoring?clubId=${alert.clubId}`
      : "/platform/monitoring",
  }));
}

function buildOnboardingNeedingAction(ctx: HealthMetricsContext): DashboardOnboardingAttentionRow[] {
  return ctx.clubs
    .filter((c) => c.status === "onboarding")
    .map((club) => {
      const clubId = String(club.id);
      const onboarding = ctx.onboardingByClubId.get(clubId);
      const missingSteps = onboarding ? missingOnboardingSteps(onboarding) : [];
      return {
        id: clubId,
        slug: String(club.slug),
        publicName: String(club.public_name),
        createdAt: String(club.created_at),
        overall: onboarding?.overall ?? "not_started",
        missingSteps,
      };
    })
    .filter((row) => row.missingSteps.length > 0 || row.overall !== "complete")
    .slice(0, DASHBOARD_ONBOARDING_LIMIT);
}

function parseAuditEntries(
  clubSlug: string,
  settings: Record<string, unknown> | null,
): PlatformRecentActionRow[] {
  return parsePlatformAuditFromSettings(settings).map((entry) => ({
    action: entry.action,
    at: entry.at,
    actorEmail: entry.actorEmail,
    clubSlug,
    metadata: entry.metadata,
  }));
}

function countActiveLeagues(ctx: HealthMetricsContext): number {
  let count = 0;
  for (const sources of ctx.sourcesByClubId.values()) {
    count += sources.filter((s) => s.is_active).length;
  }
  return count;
}

function clubLookupFromContext(ctx: HealthMetricsContext): Map<string, SyncClubLookupEntry> {
  return new Map(
    ctx.clubs.map((c) => [
      String(c.id),
      { id: String(c.id), slug: String(c.slug), public_name: String(c.public_name) },
    ]),
  );
}

export async function loadPlatformDashboard(): Promise<PlatformDashboardData> {
  const admin = createAdminClient();
  const ctx = await loadHealthMetricsContext();
  const clubById = clubLookupFromContext(ctx);

  const [jobsRes, clubHealth, leagueHealth, pendingOwnerInvites] = await Promise.all([
    admin
      .from("league_sync_jobs")
      .select(
        "id, club_id, status, records_processed, records_failed, error_message, started_at, completed_at, created_at, import_type",
      )
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_SYNC_JOB_LIMIT),
    computeClubHealthRows(ctx),
    computeLeagueHealthRows(ctx),
    buildPendingOwnerInvites(ctx),
  ]);

  if (jobsRes.error) throw new Error(jobsRes.error.message);

  const jobs = (jobsRes.data ?? []) as Parameters<typeof buildSyncMonitoringData>[0];
  const syncMonitoring = buildSyncMonitoringData(jobs, clubById, DASHBOARD_SYNC_JOB_LIMIT);

  const alerts = evaluatePlatformAlerts({
    ctx,
    clubHealth,
    leagueHealth,
    cronStatus: syncMonitoring.cron.status,
  });

  const platformHealth = platformHealthSummaryFromRows(clubHealth, leagueHealth);

  const allActions = ctx.clubs.flatMap((club) =>
    parseAuditEntries(String(club.slug), club.settings as Record<string, unknown> | null),
  );
  allActions.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const recentSyncs: PlatformRecentSyncRow[] = jobs.slice(0, DASHBOARD_RECENT_SYNC_LIMIT).map((row) => {
    const club = clubById.get(String(row.club_id));
    return {
      jobId: String(row.id),
      clubId: String(row.club_id),
      clubSlug: club ? String(club.slug) : "—",
      clubName: club ? String(club.public_name) : "—",
      status: String(row.status),
      recordsProcessed: Number(row.records_processed ?? 0),
      recordsFailed: Number(row.records_failed ?? 0),
      errorMessage: row.error_message != null ? String(row.error_message) : null,
      createdAt: String(row.created_at),
    };
  });

  const failedRecentSyncs = recentSyncs.filter((sync) => sync.status === "failed");

  return {
    kpi: {
      totalClubs: ctx.clubs.length,
      activeClubs: platformHealth.activeClubs,
      onboardingClubs: platformHealth.onboardingClubs,
      activeLeagues: countActiveLeagues(ctx),
      testClubs: countTestClubs(ctx),
      cronStatus: syncMonitoring.cron.status,
    },
    platformHealth,
    clubsRequiringAttention: buildClubsRequiringAttention(clubHealth, ctx),
    topAlerts: buildTopAlerts(alerts),
    pendingOwnerInvites,
    failedRecentSyncs,
    onboardingNeedingAction: buildOnboardingNeedingAction(ctx),
    recentSyncs,
    recentActions: allActions.slice(0, DASHBOARD_RECENT_ACTION_LIMIT),
  };
}
