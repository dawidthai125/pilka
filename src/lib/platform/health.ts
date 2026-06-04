import { createAdminClient } from "@/lib/supabase/admin";
import { computeClubOnboardingStatus } from "@/lib/platform/onboarding-status";
import { getNextCronRun, hoursSince } from "@/lib/platform/cron-schedule";
import { classifySyncJob } from "@/lib/platform/sync-category";
import { loadSyncMonitoring, type SyncMonitoringData } from "@/lib/platform/monitoring";

export type HealthLevel = "HEALTHY" | "WARNING" | "CRITICAL";

export type ClubHealthRow = {
  clubId: string;
  slug: string;
  publicName: string;
  status: string;
  score: number;
  level: HealthLevel;
  factors: string[];
  lastSyncAt: string | null;
  onboardingOverall: string;
  recentFailedSyncs: number;
  leagueActive: boolean;
};

export type LeagueHealthRow = {
  clubId: string;
  clubSlug: string;
  clubName: string;
  clubStatus: string;
  sourceId: string;
  sourceName: string;
  providerId: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  nextCronRunAt: string;
  recentErrorCount: number;
  lastJobStatus: string | null;
  lastJobAt: string | null;
  level: HealthLevel;
  factors: string[];
};

export type PlatformHealthSummary = {
  activeClubs: number;
  onboardingClubs: number;
  archivedClubs: number;
  healthyClubs: number;
  warningClubs: number;
  criticalClubs: number;
  healthyLeagues: number;
  warningLeagues: number;
  criticalLeagues: number;
};

function detectProviderFromConfig(config: Record<string, unknown>): string | null {
  if (config.provider === "manual_import") return "manual_import";
  if (config.provider === "mirror_live" || config.ninetyMinutUrl || config.ninety_minut_url) {
    return "mirror_live";
  }
  return null;
}

function levelFromScore(score: number): HealthLevel {
  if (score >= 80) return "HEALTHY";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

function evaluateClubHealth(input: {
  status: string;
  onboardingOverall: string;
  leagueActive: boolean;
  providerId: string | null;
  lastSyncAt: string | null;
  lastJobStatus: string | null;
  lastJobCategory: ReturnType<typeof classifySyncJob> | null;
  recentFailedSyncs: number;
  createdAt: string;
}): { score: number; level: HealthLevel; factors: string[] } {
  let score = 100;
  const factors: string[] = [];

  const createdDays = (Date.now() - new Date(input.createdAt).getTime()) / (1000 * 60 * 60 * 24);

  if (input.status === "archived") {
    return { score: 100, level: "HEALTHY", factors: ["Klub zarchiwizowany"] };
  }

  if (input.onboardingOverall !== "complete") {
    score -= 15;
    factors.push("Onboarding niekompletny");
  }

  if (input.status === "active" && input.onboardingOverall !== "complete") {
    score -= 20;
    factors.push("Klub aktywny publicznie, ale checklista onboardingowa nie jest complete");
  }

  if (!input.leagueActive) {
    score -= 25;
    factors.push("Brak aktywnego źródła ligi");
  }

  if (input.recentFailedSyncs >= 2) {
    score -= 30;
    factors.push(`${input.recentFailedSyncs} nieudane syncy (ostatnie 7 dni)`);
  } else if (input.recentFailedSyncs === 1) {
    score -= 15;
    factors.push("1 nieudany sync (ostatnie 7 dni)");
  }

  if (input.lastJobCategory === "FAIL") {
    score -= 25;
    factors.push(`Ostatni sync: ${input.lastJobStatus ?? "failed"}`);
  } else if (input.lastJobCategory === "WARNING") {
    score -= 10;
    factors.push(`Ostatni sync ze statusem ${input.lastJobStatus ?? "warning"}`);
  }

  if (input.providerId === "mirror_live" && input.leagueActive && input.status === "active") {
    const syncHours = hoursSince(input.lastSyncAt);
    if (syncHours == null) {
      score -= 20;
      factors.push("Mirror live aktywny — brak historii sync");
    } else if (syncHours > 48) {
      score -= 30;
      factors.push(`Ostatni sync >48 h temu (${Math.round(syncHours)} h)`);
    } else if (syncHours > 30) {
      score -= 15;
      factors.push(`Ostatni sync >30 h temu (${Math.round(syncHours)} h)`);
    }
  }

  if (input.status === "onboarding" && createdDays > 14 && input.onboardingOverall !== "complete") {
    score -= 15;
    factors.push(`Onboarding trwa >14 dni (${Math.round(createdDays)} d)`);
  }

  if (input.status === "onboarding" && createdDays > 30 && input.onboardingOverall === "not_started") {
    score -= 20;
    factors.push("Onboarding bez postępu >30 dni");
  }

  score = Math.max(0, Math.min(100, score));
  return { score, level: levelFromScore(score), factors: factors.length ? factors : ["Brak problemów"] };
}

function evaluateLeagueHealth(input: {
  clubStatus: string;
  isActive: boolean;
  providerId: string | null;
  lastSyncAt: string | null;
  lastJobStatus: string | null;
  lastJobCategory: ReturnType<typeof classifySyncJob> | null;
  recentErrorCount: number;
}): { level: HealthLevel; factors: string[] } {
  const factors: string[] = [];

  if (input.clubStatus === "archived") {
    return { level: "HEALTHY", factors: ["Klub zarchiwizowany"] };
  }

  if (input.clubStatus === "active" && !input.isActive) {
    factors.push("Klub aktywny, ale źródło ligi nieaktywne");
    return { level: "CRITICAL", factors };
  }

  if (input.lastJobCategory === "FAIL") {
    factors.push(`Ostatni job: ${input.lastJobStatus ?? "failed"}`);
    return { level: "CRITICAL", factors };
  }

  if (input.recentErrorCount >= 2) {
    factors.push(`${input.recentErrorCount} błędów sync (ostatnie 7 dni)`);
    return { level: "CRITICAL", factors };
  }

  if (input.providerId === "mirror_live" && input.isActive && input.clubStatus === "active") {
    const syncHours = hoursSince(input.lastSyncAt);
    if (syncHours == null) {
      factors.push("Mirror live — brak udanego sync");
      return { level: "CRITICAL", factors };
    }
    if (syncHours > 36) {
      factors.push(`Ostatni sync >36 h (${Math.round(syncHours)} h)`);
      return { level: "WARNING", factors };
    }
  }

  if (input.lastJobCategory === "WARNING") {
    factors.push(`Ostatni job: ${input.lastJobStatus ?? "warning"}`);
    return { level: "WARNING", factors };
  }

  if (input.providerId === "manual_import" && input.isActive && !input.lastSyncAt) {
    factors.push("Import ręczny — brak pierwszego importu");
    return { level: "WARNING", factors };
  }

  return { level: "HEALTHY", factors: ["Liga działa poprawnie"] };
}

export async function computeClubHealthRows(): Promise<ClubHealthRow[]> {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: clubs, error } = await admin
    .from("clubs")
    .select("id, slug, public_name, status, created_at")
    .order("public_name");

  if (error) throw new Error(error.message);

  const rows: ClubHealthRow[] = [];

  for (const club of clubs ?? []) {
    const clubId = String(club.id);

    const [onboarding, sourcesRes, jobsRes] = await Promise.all([
      computeClubOnboardingStatus(clubId),
      admin.from("league_sources").select("id, is_active, config, last_sync_at").eq("club_id", clubId),
      admin
        .from("league_sync_jobs")
        .select("status, records_failed, error_message, started_at, completed_at, created_at")
        .eq("club_id", clubId)
        .gte("created_at", sevenDaysAgo)
        .order("created_at", { ascending: false }),
    ]);

    const sources = sourcesRes.data ?? [];
    const leagueActive = sources.some((s) => s.is_active);
    const primarySource = sources.find((s) => s.is_active) ?? sources[0];
    const config =
      primarySource?.config && typeof primarySource.config === "object"
        ? (primarySource.config as Record<string, unknown>)
        : {};
    const providerId = detectProviderFromConfig(config);
    const lastSyncAt =
      primarySource?.last_sync_at != null ? String(primarySource.last_sync_at) : null;

    const jobs = jobsRes.data ?? [];
    const recentFailedSyncs = jobs.filter(
      (j) =>
        classifySyncJob({
          status: String(j.status),
          recordsFailed: Number(j.records_failed ?? 0),
          errorMessage: j.error_message != null ? String(j.error_message) : null,
          startedAt: j.started_at != null ? String(j.started_at) : null,
          completedAt: j.completed_at != null ? String(j.completed_at) : null,
          createdAt: String(j.created_at),
        }) === "FAIL",
    ).length;

    const latestJob = jobs[0];
    const lastJobCategory = latestJob
      ? classifySyncJob({
          status: String(latestJob.status),
          recordsFailed: Number(latestJob.records_failed ?? 0),
          errorMessage: latestJob.error_message != null ? String(latestJob.error_message) : null,
          startedAt: latestJob.started_at != null ? String(latestJob.started_at) : null,
          completedAt: latestJob.completed_at != null ? String(latestJob.completed_at) : null,
          createdAt: String(latestJob.created_at),
        })
      : null;

    const health = evaluateClubHealth({
      status: String(club.status),
      onboardingOverall: onboarding.overall,
      leagueActive,
      providerId,
      lastSyncAt,
      lastJobStatus: latestJob ? String(latestJob.status) : null,
      lastJobCategory,
      recentFailedSyncs,
      createdAt: String(club.created_at),
    });

    rows.push({
      clubId,
      slug: String(club.slug),
      publicName: String(club.public_name),
      status: String(club.status),
      score: health.score,
      level: health.level,
      factors: health.factors,
      lastSyncAt,
      onboardingOverall: onboarding.overall,
      recentFailedSyncs,
      leagueActive,
    });
  }

  return rows.sort((a, b) => a.score - b.score);
}

export async function computeLeagueHealthRows(): Promise<LeagueHealthRow[]> {
  const admin = createAdminClient();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const nextCron = getNextCronRun().toISOString();

  const { data: sources, error } = await admin
    .from("league_sources")
    .select("id, club_id, name, is_active, config, last_sync_at, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const { data: clubs } = await admin.from("clubs").select("id, slug, public_name, status");
  const clubById = new Map((clubs ?? []).map((c) => [String(c.id), c]));

  const rows: LeagueHealthRow[] = [];

  for (const source of sources ?? []) {
    const clubId = String(source.club_id);
    const club = clubById.get(clubId);
    if (!club) continue;

    const config =
      source.config && typeof source.config === "object"
        ? (source.config as Record<string, unknown>)
        : {};
    const providerId = detectProviderFromConfig(config);

    const { data: jobs } = await admin
      .from("league_sync_jobs")
      .select("status, records_failed, error_message, started_at, completed_at, created_at")
      .eq("club_id", clubId)
      .eq("source_id", String(source.id))
      .order("created_at", { ascending: false })
      .limit(20);

    const allRecent = (jobs ?? []).filter(
      (j) => new Date(String(j.created_at)).getTime() >= new Date(sevenDaysAgo).getTime(),
    );
    const recentErrorCount = allRecent.filter(
      (j) =>
        classifySyncJob({
          status: String(j.status),
          recordsFailed: Number(j.records_failed ?? 0),
          errorMessage: j.error_message != null ? String(j.error_message) : null,
          startedAt: j.started_at != null ? String(j.started_at) : null,
          completedAt: j.completed_at != null ? String(j.completed_at) : null,
          createdAt: String(j.created_at),
        }) === "FAIL",
    ).length;

    const latestJob = jobs?.[0];
    const lastJobCategory = latestJob
      ? classifySyncJob({
          status: String(latestJob.status),
          recordsFailed: Number(latestJob.records_failed ?? 0),
          errorMessage: latestJob.error_message != null ? String(latestJob.error_message) : null,
          startedAt: latestJob.started_at != null ? String(latestJob.started_at) : null,
          completedAt: latestJob.completed_at != null ? String(latestJob.completed_at) : null,
          createdAt: String(latestJob.created_at),
        })
      : null;

    const evaluation = evaluateLeagueHealth({
      clubStatus: String(club.status),
      isActive: Boolean(source.is_active),
      providerId,
      lastSyncAt: source.last_sync_at != null ? String(source.last_sync_at) : null,
      lastJobStatus: latestJob ? String(latestJob.status) : null,
      lastJobCategory,
      recentErrorCount,
    });

    rows.push({
      clubId,
      clubSlug: String(club.slug),
      clubName: String(club.public_name),
      clubStatus: String(club.status),
      sourceId: String(source.id),
      sourceName: String(source.name),
      providerId,
      isActive: Boolean(source.is_active),
      lastSyncAt: source.last_sync_at != null ? String(source.last_sync_at) : null,
      nextCronRunAt: providerId === "mirror_live" && source.is_active ? nextCron : "—",
      recentErrorCount,
      lastJobStatus: latestJob ? String(latestJob.status) : null,
      lastJobAt: latestJob ? String(latestJob.created_at) : null,
      level: evaluation.level,
      factors: evaluation.factors,
    });
  }

  const severity = { CRITICAL: 0, WARNING: 1, HEALTHY: 2 };
  return rows.sort((a, b) => severity[a.level] - severity[b.level]);
}

export async function computePlatformHealthSummary(): Promise<PlatformHealthSummary> {
  const [clubRows, leagueRows] = await Promise.all([
    computeClubHealthRows(),
    computeLeagueHealthRows(),
  ]);

  return {
    activeClubs: clubRows.filter((c) => c.status === "active").length,
    onboardingClubs: clubRows.filter((c) => c.status === "onboarding").length,
    archivedClubs: clubRows.filter((c) => c.status === "archived").length,
    healthyClubs: clubRows.filter((c) => c.level === "HEALTHY").length,
    warningClubs: clubRows.filter((c) => c.level === "WARNING").length,
    criticalClubs: clubRows.filter((c) => c.level === "CRITICAL").length,
    healthyLeagues: leagueRows.filter((l) => l.level === "HEALTHY").length,
    warningLeagues: leagueRows.filter((l) => l.level === "WARNING").length,
    criticalLeagues: leagueRows.filter((l) => l.level === "CRITICAL").length,
  };
}

export type PlatformMonitoringBundle = {
  syncMonitoring: SyncMonitoringData;
  clubHealth: ClubHealthRow[];
  leagueHealth: LeagueHealthRow[];
};

export async function loadPlatformMonitoringBundle(): Promise<PlatformMonitoringBundle> {
  const [syncMonitoring, clubHealth, leagueHealth] = await Promise.all([
    loadSyncMonitoring(),
    computeClubHealthRows(),
    computeLeagueHealthRows(),
  ]);
  return { syncMonitoring, clubHealth, leagueHealth };
}
