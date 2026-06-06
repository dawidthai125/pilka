#!/usr/bin/env node
/**
 * Sprint 18.6B — Platform Alerts v1 validation.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function testSources() {
  const alerts = readFileSync(join(root, "src/lib/platform/platform-alerts.ts"), "utf8");
  const health = readFileSync(join(root, "src/lib/platform/health.ts"), "utf8");
  const view = readFileSync(join(root, "src/features/platform/components/sync-monitoring-view.tsx"), "utf8");

  assert(alerts.includes("evaluatePlatformAlerts"), "evaluatePlatformAlerts missing");
  assert(alerts.includes("dedupeAndPolishAlerts"), "dedupeAndPolishAlerts missing");
  assert(alerts.includes("isTestClubSlug"), "isTestClubSlug missing");
  assert(alerts.includes("isTestClub"), "isTestClub with settings.isTest");
  assert(alerts.includes("summarizePlatformAlerts"), "summarizePlatformAlerts missing");
  assert(!alerts.includes("platform_sync_metrics(") || alerts.includes("metricsByClubId"), "use context only");
  assert(!alerts.includes("loadPlatformSyncMetrics"), "no extra loader in alerts");
  assert(!alerts.includes("league_sync_jobs"), "no direct jobs query");
  assert(health.includes("evaluatePlatformAlerts"), "bundle must evaluate alerts");
  assert(
    health.includes("alerts:") || /return\s*\{[\s\S]*\balerts\b/.test(health),
    "bundle must expose alerts",
  );
  const interactive = readFileSync(
    join(root, "src/features/platform/components/monitoring-interactive.tsx"),
    "utf8",
  );
  assert(
    view.includes("alerts") && view.includes("MonitoringInteractive"),
    "monitoring view must pass alerts to interactive shell",
  );
  assert(interactive.includes("PlatformAlertsPanel"), "interactive must render alerts panel");
  const panel = readFileSync(
    join(root, "src/features/platform/components/platform-alerts-panel.tsx"),
    "utf8",
  );
  assert(panel.includes("summarizePlatformAlerts"), "panel must show severity summary");
  assert(panel.includes("factors"), "panel must render grouped factors");
  assert(
    readFileSync(join(root, "src/lib/platform/monitoring-filters.ts"), "utf8").includes("filtersFromAlert"),
    "filtersFromAlert required",
  );
  console.log("OK source constraints");
}

async function testEvaluator() {
  const { evaluatePlatformAlerts } = await import("../src/lib/platform/platform-alerts.ts");

  const ctx = {
    windowDays: 7,
    metricsByClubId: new Map([
      [
        "club-a",
        {
          clubId: "club-a",
          lastSuccessAt: null,
          successRate: 40,
          failedCount: 2,
          jobCount: 5,
          freshnessHours: 100,
          avgDurationMs: 90_000,
          p95DurationMs: 150_000,
          hasRunningJob: false,
        },
      ],
    ]),
    clubs: [
      {
        id: "club-a",
        slug: "piorun-wawrzenczyce",
        public_name: "Piorun",
        status: "active",
        created_at: "2026-01-01",
      },
    ],
    sourcesByClubId: new Map([
      [
        "club-a",
        [
          {
            id: "src-a",
            club_id: "club-a",
            name: "Mirror",
            is_active: true,
            config: { provider: "mirror_live" },
            last_sync_at: null,
          },
        ],
      ],
    ]),
    onboardingByClubId: new Map([
      ["club-a", { branding: "complete", website: "complete", league: "complete", owner: "complete", media: "complete", overall: "complete" }],
    ]),
  };

  const clubHealth = [
    {
      clubId: "club-a",
      slug: "piorun-wawrzenczyce",
      publicName: "Piorun",
      status: "active",
      score: 45,
      level: "CRITICAL",
      factors: [],
      lastSyncAt: null,
      onboardingOverall: "complete",
      recentFailedSyncs: 2,
      leagueActive: true,
    },
  ];

  const alerts = evaluatePlatformAlerts({
    ctx,
    clubHealth,
    leagueHealth: [],
    cronStatus: "FAIL",
  });

  assert(alerts.some((a) => a.severity === "CRITICAL" && a.type === "cron_fail"), "cron_fail");
  assert(alerts[0].type === "cron_fail", "cron first by priority");
  const clubCritical = alerts.filter((a) => a.clubId === "club-a" && a.severity === "CRITICAL");
  assert(clubCritical.length === 1, "club CRITICAL deduped to one row");
  assert(
    clubCritical[0].factors.length >= 2,
    "grouped club alert must list contributing factors",
  );
  const { isTestClubSlug } = await import("../src/lib/platform/platform-alerts.ts");
  assert(isTestClubSlug("pilot-club-test"), "test slug");
  assert(isTestClubSlug("release-184a-mpz313we"), "release test prefix");
  console.log("OK evaluator unit");
}

async function main() {
  testSources();
  await testEvaluator();
  console.log("\nvalidate-186b-platform-alerts: PASS");
}

main().catch((err) => {
  console.error("\nvalidate-186b-platform-alerts: FAIL", err.message);
  process.exit(1);
});
