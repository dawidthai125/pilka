import type { SyncCategory } from "@/lib/platform/sync-category";
import type { ClubHealthRow, LeagueHealthRow } from "@/lib/platform/health-types";
import type { HealthMetricsContext } from "@/lib/platform/health";

/** Zgodne z `club-test.ts` — lokalna kopia dla importów Node (validate-186b). */
const TEST_CLUB_SLUGS = new Set(["pilot-club-test"]);
const TEST_CLUB_SLUG_PREFIXES = ["release-184a-", "pilot-club-"];

export function isTestClubSlug(slug: string): boolean {
  if (TEST_CLUB_SLUGS.has(slug)) return true;
  return TEST_CLUB_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix));
}

function parseClubSettings(settings: unknown): Record<string, unknown> | null {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    return settings as Record<string, unknown>;
  }
  return null;
}

function isTestClub(slug: string, settings?: Record<string, unknown> | null): boolean {
  if (settings?.isTest === true) return true;
  return isTestClubSlug(slug);
}

export type PlatformAlertSeverity = "CRITICAL" | "WARNING" | "INFO";

/** Kolejność wyświetlania (niżej = ważniejsze). */
export type PlatformAlertPriorityGroup =
  | "cron"
  | "platform"
  | "club_critical"
  | "league_critical"
  | "warning"
  | "info";

export type PlatformAlert = {
  severity: PlatformAlertSeverity;
  title: string;
  description: string;
  /** Dodatkowe ustalenia po deduplikacji (ten sam klub / problem). */
  factors: string[];
  /** Co operator ma sprawdzić po kliknięciu. */
  checkHint: string;
  clubId: string | null;
  sourceId: string | null;
  provider: string | null;
  type: string;
  priorityGroup: PlatformAlertPriorityGroup;
  sortOrder: number;
};

export type PlatformAlertSummary = {
  critical: number;
  warning: number;
  info: number;
  total: number;
};

const PRIORITY_GROUP_ORDER: Record<PlatformAlertPriorityGroup, number> = {
  cron: 0,
  platform: 1,
  club_critical: 2,
  league_critical: 3,
  warning: 4,
  info: 5,
};

const CLUB_GROUPABLE_TYPES = new Set([
  "club_health_critical",
  "club_health_warning",
  "freshness_critical",
  "freshness_warning",
  "sync_failures_critical",
  "sync_failure_warning",
  "slow_sync",
  "sync_running",
  "onboarding",
]);

const TYPE_SORT_IN_GROUP: Record<string, number> = {
  sync_failures_critical: 0,
  freshness_critical: 1,
  club_health_critical: 2,
  sync_failure_warning: 3,
  freshness_warning: 4,
  club_health_warning: 5,
  slow_sync: 6,
  sync_running: 10,
  onboarding: 11,
};

type RawAlert = Omit<PlatformAlert, "factors" | "checkHint" | "priorityGroup" | "sortOrder">;

function detectProviderFromConfig(config: Record<string, unknown>): string | null {
  if (config.provider === "manual_import") return "manual_import";
  if (config.provider === "mirror_live" || config.ninetyMinutUrl || config.ninety_minut_url) {
    return "mirror_live";
  }
  return null;
}

function clubSettingsFor(ctx: HealthMetricsContext, clubId: string): Record<string, unknown> | null {
  const club = ctx.clubs.find((c) => String(c.id) === clubId);
  return parseClubSettings(club?.settings);
}

function clubHasMirrorLive(ctx: HealthMetricsContext, clubId: string): boolean {
  const sources = ctx.sourcesByClubId.get(clubId) ?? [];
  return sources.some((s) => {
    if (!s.is_active) return false;
    const config =
      s.config && typeof s.config === "object" ? (s.config as Record<string, unknown>) : {};
    return detectProviderFromConfig(config) === "mirror_live";
  });
}

function checkHintFor(alert: Pick<PlatformAlert, "type" | "provider" | "clubId" | "sourceId">): string {
  if (alert.type === "cron_fail") {
    return "Sprawdź kartę Cron ligowy i Sync History (filtr: błędy).";
  }
  if (alert.sourceId) {
    return "Sprawdź Sync History dla tego źródła ligi i League Health.";
  }
  if (alert.provider === "mirror_live") {
    return "Sprawdź Sync History (mirror_live) i świeżość danych w Club Health.";
  }
  if (alert.clubId) {
    return "Sprawdź Sync History i Club Health dla tego klubu.";
  }
  return "Sprawdź Sync History w Monitoring Center.";
}

function collectRawAlerts(input: {
  ctx: HealthMetricsContext;
  clubHealth: ClubHealthRow[];
  leagueHealth: LeagueHealthRow[];
  cronStatus: SyncCategory;
}): RawAlert[] {
  const { ctx, clubHealth, leagueHealth, cronStatus } = input;
  const raw: RawAlert[] = [];

  if (cronStatus === "FAIL") {
    raw.push({
      severity: "CRITICAL",
      title: "Cron ligowy zakończył się błędem",
      description:
        "Harmonogram synchronizacji platformy zgłasza FAIL — ostatnie uruchomienia cron nie zakończyły się poprawnie.",
      clubId: null,
      sourceId: null,
      provider: null,
      type: "cron_fail",
    });
  } else if (cronStatus === "WARNING") {
    raw.push({
      severity: "WARNING",
      title: "Cron ligowy wymaga uwagi",
      description:
        "Monitoring cron wskazuje WARNING (np. brak sukcesu w 36 h lub ostrzeżenia w ostatnich runach).",
      clubId: null,
      sourceId: null,
      provider: null,
      type: "cron_warning",
    });
  }

  for (const club of clubHealth) {
    if (club.status === "archived") continue;
    if (isTestClub(club.slug, clubSettingsFor(ctx, club.clubId))) continue;

    const metrics = ctx.metricsByClubId.get(club.clubId);
    const onboarding = ctx.onboardingByClubId.get(club.clubId);
    const mirrorLive = clubHasMirrorLive(ctx, club.clubId);
    const name = club.publicName;

    if (club.score < 50) {
      raw.push({
        severity: "CRITICAL",
        title: `Krytyczny stan synchronizacji — ${name}`,
        description: `Klub ${name} ma health score ${club.score}/100 (CRITICAL). Wymagana natychmiastowa weryfikacja pipeline sync.`,
        clubId: club.clubId,
        sourceId: null,
        provider: null,
        type: "club_health_critical",
      });
    } else if (club.score < 80) {
      raw.push({
        severity: "WARNING",
        title: `Obniżona kondycja sync — ${name}`,
        description: `Klub ${name} ma health score ${club.score}/100 (WARNING).`,
        clubId: club.clubId,
        sourceId: null,
        provider: null,
        type: "club_health_warning",
      });
    }

    if (mirrorLive && club.status === "active") {
      const freshness = metrics?.freshnessHours ?? null;
      if (freshness != null && freshness > 96) {
        raw.push({
          severity: "CRITICAL",
          title: `Brak aktualnych danych — ${name}`,
          description: `Dane klubu ${name} nie były pomyślnie synchronizowane od ${Math.round(freshness)} godzin (mirror live).`,
          clubId: club.clubId,
          sourceId: null,
          provider: "mirror_live",
          type: "freshness_critical",
        });
      } else if (freshness != null && freshness > 48) {
        raw.push({
          severity: "WARNING",
          title: `Dane nieaktualne — ${name}`,
          description: `Ostatni udany sync klubu ${name} był ${Math.round(freshness)} godzin temu (próg 48–96 h).`,
          clubId: club.clubId,
          sourceId: null,
          provider: "mirror_live",
          type: "freshness_warning",
        });
      }
    }

    const failedCount = metrics?.failedCount ?? 0;
    if (failedCount >= 2) {
      raw.push({
        severity: "CRITICAL",
        title: `Wielokrotne błędy sync — ${name}`,
        description: `W ostatnich ${ctx.windowDays} dniach klub ${name} ma ${failedCount} nieudanych jobów synchronizacji.`,
        clubId: club.clubId,
        sourceId: null,
        provider: null,
        type: "sync_failures_critical",
      });
    } else if (failedCount === 1) {
      raw.push({
        severity: "WARNING",
        title: `Pojedynczy błąd sync — ${name}`,
        description: `Klub ${name} ma 1 nieudany job w oknie ${ctx.windowDays} dni — sprawdź komunikat błędu w Sync History.`,
        clubId: club.clubId,
        sourceId: null,
        provider: null,
        type: "sync_failure_warning",
      });
    }

    const p95 = metrics?.p95DurationMs ?? null;
    const avg = metrics?.avgDurationMs ?? null;
    if ((p95 != null && p95 > 120_000) || (avg != null && avg > 60_000)) {
      raw.push({
        severity: "WARNING",
        title: `Wolne synchronizacje — ${name}`,
        description: `Sync klubu ${name} trwa dłużej niż oczekiwano (średnio ${avg != null ? Math.round(avg / 1000) : "—"} s, p95 ${p95 != null ? Math.round(p95 / 1000) : "—"} s).`,
        clubId: club.clubId,
        sourceId: null,
        provider: null,
        type: "slow_sync",
      });
    }

    if (metrics?.hasRunningJob) {
      raw.push({
        severity: "INFO",
        title: `Sync w toku — ${name}`,
        description: `Klub ${name} ma job w statusie pending/running (ostatnie 2 godziny).`,
        clubId: club.clubId,
        sourceId: null,
        provider: null,
        type: "sync_running",
      });
    }

    if (
      club.status === "onboarding" ||
      (club.status === "active" && onboarding?.overall !== "complete")
    ) {
      raw.push({
        severity: "INFO",
        title: `Onboarding — ${name}`,
        description: `Klub ${name}: status ${club.status}, checklista onboarding ${onboarding?.overall ?? "nieznany"}.`,
        clubId: club.clubId,
        sourceId: null,
        provider: null,
        type: "onboarding",
      });
    }
  }

  for (const league of leagueHealth) {
    if (league.clubStatus === "archived") continue;
    if (isTestClub(league.clubSlug, clubSettingsFor(ctx, league.clubId))) continue;
    if (league.level !== "CRITICAL" && league.level !== "WARNING") continue;

    const isCritical = league.level === "CRITICAL";
    const severity = isCritical ? "CRITICAL" : "WARNING";

    raw.push({
      severity,
      title: isCritical
        ? `Źródło ligi w stanie krytycznym — ${league.clubName}`
        : `Źródło ligi wymaga uwagi — ${league.clubName}`,
      description: `Źródło „${league.sourceName}” (${league.providerId ?? "brak providera"}): ${league.factors.join(" · ")}`,
      clubId: league.clubId,
      sourceId: league.sourceId,
      provider: league.providerId,
      type: isCritical ? "league_health_critical" : "league_health_warning",
    });

  }

  const testClubCount = clubHealth.filter((c) =>
    isTestClub(c.slug, clubSettingsFor(ctx, c.clubId)),
  ).length;
  if (testClubCount > 0) {
    raw.push({
      severity: "INFO",
      title: `Kluby testowe (${testClubCount})`,
      description:
        "Alerty operacyjne dla klubów testowych (np. pilot-club-test, release-184a-*) są ukryte, aby nie zasłaniały produkcji.",
      clubId: null,
      sourceId: null,
      provider: null,
      type: "test_clubs_hidden",
    });
  }

  return raw;
}

function priorityGroupFor(alert: RawAlert): PlatformAlertPriorityGroup {
  if (alert.type === "cron_fail" || alert.type === "cron_warning") return "cron";
  if (!alert.clubId && !alert.sourceId) return "platform";
  if (alert.severity === "CRITICAL" && alert.sourceId) return "league_critical";
  if (alert.severity === "CRITICAL" && alert.clubId) return "club_critical";
  if (alert.severity === "WARNING") return "warning";
  return "info";
}

function groupKey(alert: RawAlert): string | null {
  if (!alert.clubId || !CLUB_GROUPABLE_TYPES.has(alert.type)) return null;
  return `${alert.clubId}:${alert.severity}`;
}

function pickPrimary(alerts: RawAlert[]): RawAlert {
  return [...alerts].sort(
    (a, b) => (TYPE_SORT_IN_GROUP[a.type] ?? 50) - (TYPE_SORT_IN_GROUP[b.type] ?? 50),
  )[0]!;
}

function mergeClubGroup(alerts: RawAlert[]): PlatformAlert {
  const primary = pickPrimary(alerts);
  const factors = alerts
    .filter((a) => a.type !== primary.type)
    .map((a) => a.description)
    .filter((desc, idx, arr) => arr.indexOf(desc) === idx);

  const extraFromPrimary = primary.description;
  const allFactors =
    factors.length > 0 ? factors : [];

  return {
    severity: primary.severity,
    title: primary.title,
    description: extraFromPrimary,
    factors: allFactors,
    checkHint: checkHintFor(primary),
    clubId: primary.clubId,
    sourceId: primary.sourceId,
    provider: primary.provider,
    type: primary.type,
    priorityGroup: priorityGroupFor(primary),
    sortOrder: PRIORITY_GROUP_ORDER[priorityGroupFor(primary)],
  };
}

function attachLeagueToClubGroup(
  grouped: PlatformAlert[],
  league: RawAlert,
): boolean {
  if (!league.clubId || league.severity !== "CRITICAL") return false;
  const clubGroup = grouped.find(
    (a) => a.clubId === league.clubId && a.priorityGroup === "club_critical",
  );
  if (!clubGroup) return false;
  clubGroup.factors.push(league.description);
  if (league.sourceId && !clubGroup.sourceId) {
    clubGroup.sourceId = league.sourceId;
    clubGroup.provider = league.provider ?? clubGroup.provider;
  }
  return true;
}

export function dedupeAndPolishAlerts(raw: RawAlert[]): PlatformAlert[] {
  const clubGroups = new Map<string, RawAlert[]>();
  const standalone: RawAlert[] = [];

  for (const alert of raw) {
    const key = groupKey(alert);
    if (key) {
      const list = clubGroups.get(key) ?? [];
      list.push(alert);
      clubGroups.set(key, list);
    } else {
      standalone.push(alert);
    }
  }

  const result: PlatformAlert[] = [];

  for (const [, group] of clubGroups) {
    if (group.length === 1) {
      const one = group[0]!;
      result.push({
        ...one,
        factors: [],
        checkHint: checkHintFor(one),
        priorityGroup: priorityGroupFor(one),
        sortOrder: PRIORITY_GROUP_ORDER[priorityGroupFor(one)],
      });
    } else {
      result.push(mergeClubGroup(group));
    }
  }

  for (const alert of standalone) {
    if (alert.type === "league_health_critical" && attachLeagueToClubGroup(result, alert)) {
      continue;
    }

    result.push({
      ...alert,
      factors: [],
      checkHint: checkHintFor(alert),
      priorityGroup: priorityGroupFor(alert),
      sortOrder: PRIORITY_GROUP_ORDER[priorityGroupFor(alert)],
    });
  }

  return result.sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    const sev =
      (a.severity === "CRITICAL" ? 0 : a.severity === "WARNING" ? 1 : 2) -
      (b.severity === "CRITICAL" ? 0 : b.severity === "WARNING" ? 1 : 2);
    if (sev !== 0) return sev;
    return a.title.localeCompare(b.title, "pl");
  });
}

export function summarizePlatformAlerts(alerts: PlatformAlert[]): PlatformAlertSummary {
  return {
    critical: alerts.filter((a) => a.severity === "CRITICAL").length,
    warning: alerts.filter((a) => a.severity === "WARNING").length,
    info: alerts.filter((a) => a.severity === "INFO").length,
    total: alerts.length,
  };
}

export function evaluatePlatformAlerts(input: {
  ctx: HealthMetricsContext;
  clubHealth: ClubHealthRow[];
  leagueHealth: LeagueHealthRow[];
  cronStatus: SyncCategory;
}): PlatformAlert[] {
  const raw = collectRawAlerts(input);
  return dedupeAndPolishAlerts(raw);
}
