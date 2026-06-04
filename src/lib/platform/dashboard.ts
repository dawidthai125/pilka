import { createAdminClient } from "@/lib/supabase/admin";
import { computeClubOnboardingStatus } from "@/lib/platform/onboarding-status";
import type { PlatformAuditEntry } from "@/lib/platform/audit";
import { computePlatformHealthSummary, type PlatformHealthSummary } from "@/lib/platform/health";
import { PLATFORM_AUDIT_ACTION_LABELS } from "@/lib/platform/platform-audit-actions";

export type PlatformDashboardKpi = {
  totalClubs: number;
  activeClubs: number;
  onboardingClubs: number;
  activeLeagues: number;
};

export type PlatformOnboardingRow = {
  id: string;
  slug: string;
  publicName: string;
  createdAt: string;
  overall: string;
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
  onboardingClubs: PlatformOnboardingRow[];
  recentSyncs: PlatformRecentSyncRow[];
  recentActions: PlatformRecentActionRow[];
};

export { PLATFORM_AUDIT_ACTION_LABELS };

function parseAuditEntries(
  clubSlug: string,
  settings: Record<string, unknown> | null,
): PlatformRecentActionRow[] {
  const raw = settings?.platformAudit;
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is PlatformAuditEntry => {
      return (
        entry &&
        typeof entry === "object" &&
        typeof (entry as PlatformAuditEntry).action === "string" &&
        typeof (entry as PlatformAuditEntry).at === "string"
      );
    })
    .map((entry) => ({
      action: entry.action,
      at: entry.at,
      actorEmail: entry.actorEmail,
      clubSlug,
      metadata: entry.metadata,
    }));
}

export async function loadPlatformDashboard(): Promise<PlatformDashboardData> {
  const admin = createAdminClient();

  const [clubsRes, leaguesRes, syncsRes, platformHealth] = await Promise.all([
    admin.from("clubs").select("id, slug, public_name, status, settings, created_at").order("created_at", {
      ascending: false,
    }),
    admin.from("league_sources").select("id", { count: "exact", head: true }).eq("is_active", true),
    admin
      .from("league_sync_jobs")
      .select("id, club_id, status, records_processed, records_failed, error_message, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    computePlatformHealthSummary(),
  ]);

  if (clubsRes.error) throw new Error(clubsRes.error.message);

  const clubs = clubsRes.data ?? [];
  const clubById = new Map(clubs.map((c) => [String(c.id), c]));
  const activeClubs = clubs.filter((c) => c.status === "active").length;
  const onboardingClubsRaw = clubs.filter((c) => c.status === "onboarding");

  const onboardingClubs: PlatformOnboardingRow[] = [];
  for (const club of onboardingClubsRaw.slice(0, 10)) {
    const onboarding = await computeClubOnboardingStatus(String(club.id));
    onboardingClubs.push({
      id: String(club.id),
      slug: String(club.slug),
      publicName: String(club.public_name),
      createdAt: String(club.created_at),
      overall: onboarding.overall,
    });
  }

  const allActions = clubs.flatMap((club) =>
    parseAuditEntries(String(club.slug), club.settings as Record<string, unknown> | null),
  );
  allActions.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

  const recentSyncs: PlatformRecentSyncRow[] = (syncsRes.data ?? []).map((row) => {
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

  return {
    kpi: {
      totalClubs: clubs.length,
      activeClubs,
      onboardingClubs: onboardingClubsRaw.length,
      activeLeagues: leaguesRes.count ?? 0,
    },
    platformHealth,
    onboardingClubs,
    recentSyncs,
    recentActions: allActions.slice(0, 15),
  };
}
