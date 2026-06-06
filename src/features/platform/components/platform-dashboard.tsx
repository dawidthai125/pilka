import Link from "next/link";

import { OnboardingStatusBadge } from "@/features/platform/components/onboarding-status-grid";
import {
  formatPlatformDate,
  HealthLevelBadge,
} from "@/features/platform/components/platform-status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformDashboardData } from "@/lib/platform/dashboard";
import { PLATFORM_AUDIT_ACTION_LABELS } from "@/lib/platform/platform-audit-actions";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES = {
  CRITICAL: "text-red-300",
  WARNING: "text-amber-300",
  INFO: "text-sky-300",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Aktywny",
  onboarding: "Onboarding",
  archived: "Archiwum",
};

function syncStatusClass(status: string) {
  if (status === "completed") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  if (status === "running") return "text-amber-300";
  return "text-white/60";
}

function cronStatusClass(status: string) {
  if (status === "PASS") return "text-emerald-300";
  if (status === "FAIL") return "text-red-300";
  return "text-amber-300";
}

type TodayItem = {
  key: string;
  kind: string;
  title: string;
  detail: string;
  href: string;
  action: string;
  tone?: "critical" | "warning" | "default";
};

function buildTodayItems(data: PlatformDashboardData): TodayItem[] {
  const items: TodayItem[] = [];

  for (const alert of data.topAlerts.filter((a) => a.severity === "CRITICAL")) {
    items.push({
      key: `alert-${alert.title}`,
      kind: "Alert",
      title: alert.title,
      detail: alert.description,
      href: alert.monitoringHref,
      action: "Monitoring",
      tone: "critical",
    });
  }

  for (const club of data.clubsRequiringAttention) {
    items.push({
      key: `attention-${club.id}`,
      kind: "Uwaga",
      title: club.publicName,
      detail: club.mainProblem,
      href: `/platform/clubs/${club.id}`,
      action: "Szczegóły",
      tone: club.healthLevel === "CRITICAL" ? "critical" : "warning",
    });
  }

  for (const sync of data.failedRecentSyncs) {
    items.push({
      key: `sync-${sync.jobId}`,
      kind: "Sync",
      title: `${sync.clubName} — sync failed`,
      detail: sync.errorMessage ?? `${sync.recordsFailed} błędów zapisu`,
      href: `/platform/monitoring?clubId=${sync.clubId}`,
      action: "Monitoring",
      tone: "critical",
    });
  }

  for (const owner of data.pendingOwnerInvites) {
    items.push({
      key: `owner-${owner.clubId}`,
      kind: "Właściciel",
      title: owner.publicName,
      detail: `${owner.ownerEmail ?? "brak email"} · invited ${owner.daysPending} dni`,
      href: `/platform/clubs/${owner.clubId}`,
      action: "Zaproszenie",
      tone: owner.daysPending >= 7 ? "warning" : "default",
    });
  }

  return items;
}

export function PlatformDashboardView({ data }: { data: PlatformDashboardData }) {
  const {
    kpi,
    platformHealth,
    onboardingNeedingAction,
    recentSyncs,
    recentActions,
  } = data;

  const todayItems = buildTodayItems(data);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Wymaga dzisiaj</h2>
          <Link href="/platform/monitoring" className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline">
            Monitoring →
          </Link>
        </div>
        {todayItems.length === 0 ? (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/85">
            Brak pilnych działań — platforma w normie.
          </p>
        ) : (
          <ul className="space-y-2">
            {todayItems.map((item) => (
              <li key={item.key}>
                <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-white/45">
                      <span
                        className={cn(
                          item.tone === "critical" && "text-red-300",
                          item.tone === "warning" && "text-amber-300",
                        )}
                      >
                        {item.kind}
                      </span>
                      <span className="font-medium text-white">{item.title}</span>
                    </div>
                    <p className="mt-1 text-sm text-white/60 line-clamp-2">{item.detail}</p>
                  </div>
                  <Link
                    href={item.href}
                    className="shrink-0 text-xs font-medium text-[var(--club-secondary,#F4C430)] hover:underline"
                  >
                    {item.action} →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Stan platformy</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Kluby łącznie", value: kpi.totalClubs },
            { label: "Aktywne", value: kpi.activeClubs },
            { label: "Onboarding", value: kpi.onboardingClubs },
            { label: "Kluby testowe", value: kpi.testClubs },
          ].map(({ label, value }) => (
            <Card key={label} className="border-white/10 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/45">{label}</CardTitle>
              </CardHeader>
              <CardContent className="text-3xl font-bold tabular-nums">{value}</CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "HEALTHY", value: platformHealth.healthyClubs, tone: "healthy" as const },
            { label: "WARNING", value: platformHealth.warningClubs, tone: "warning" as const },
            { label: "CRITICAL", value: platformHealth.criticalClubs, tone: "critical" as const },
            { label: "Aktywne ligi", value: kpi.activeLeagues },
            {
              label: "Cron sync",
              value: kpi.cronStatus,
              tone:
                kpi.cronStatus === "FAIL"
                  ? ("critical" as const)
                  : kpi.cronStatus === "WARNING"
                    ? ("warning" as const)
                    : undefined,
              isText: true,
            },
          ].map(({ label, value, tone, isText }) => (
            <Card key={label} className="border-white/10 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/45">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    isText ? "text-lg font-semibold uppercase" : "text-3xl font-bold tabular-nums",
                    tone === "healthy" && typeof value === "number" && value > 0 && "text-emerald-300",
                    tone === "warning" && typeof value === "number" && value > 0 && "text-amber-300",
                    tone === "critical" && "text-red-300",
                    isText && !tone && cronStatusClass(String(value)),
                  )}
                >
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Monitoring i operacje</h2>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Onboarding</h3>
            <Link href="/platform/clubs?status=onboarding" className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline">
              Wszystkie →
            </Link>
          </div>
          {onboardingNeedingAction.length === 0 ? (
            <p className="text-sm text-white/50">Brak klubów w onboardingu z brakującymi krokami.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-left text-sm text-white">
                <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-white/45">
                  <tr>
                    <th className="px-4 py-3">Klub</th>
                    <th className="px-4 py-3">Postęp</th>
                    <th className="px-4 py-3">Brakujące elementy</th>
                    <th className="px-4 py-3 text-right">Akcja</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/8">
                  {onboardingNeedingAction.map((club) => (
                    <tr key={club.id} className="hover:bg-white/[0.03]">
                      <td className="px-4 py-3">
                        <p className="font-medium">{club.publicName}</p>
                        <p className="text-xs text-white/45">/{club.slug}</p>
                      </td>
                      <td className="px-4 py-3">
                        <OnboardingStatusBadge
                          status={club.overall as "not_started" | "in_progress" | "complete"}
                        />
                      </td>
                      <td className="px-4 py-3 text-white/65">
                        {club.missingSteps.length > 0 ? club.missingSteps.join(" · ") : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/platform/clubs/${club.id}`}
                          className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline"
                        >
                          Kontynuuj →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Ostatnie synchronizacje</h3>
            <Link href="/platform/monitoring" className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline">
              Historia sync →
            </Link>
          </div>
          {recentSyncs.length === 0 ? (
            <p className="text-sm text-white/50">Brak zadań synchronizacji.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-left text-sm text-white">
                <thead className="border-b border-white/10 bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Klub</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Rekordy</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSyncs.map((sync) => (
                    <tr key={sync.jobId} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3">
                        <Link href={`/platform/monitoring?clubId=${sync.clubId}`} className="font-medium hover:underline">
                          {sync.clubName}
                        </Link>
                        <span className="ml-2 text-white/45">/{sync.clubSlug}</span>
                      </td>
                      <td className={cn("px-4 py-3 font-medium uppercase", syncStatusClass(sync.status))}>
                        {sync.status}
                      </td>
                      <td className="px-4 py-3 text-white/70">
                        {sync.recordsProcessed} OK · {sync.recordsFailed} bł.
                      </td>
                      <td className="px-4 py-3 text-white/60">{formatPlatformDate(sync.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-white/40">Ostatnie operacje</h3>
            <Link href="/platform/audit" className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline">
              Audit →
            </Link>
          </div>
          {recentActions.length === 0 ? (
            <p className="text-sm text-white/50">Brak wpisów audit log.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[640px] text-left text-sm text-white">
                <thead className="border-b border-white/10 bg-white/5 text-white/45">
                  <tr>
                    <th className="px-4 py-3 font-medium">Akcja</th>
                    <th className="px-4 py-3 font-medium">Klub</th>
                    <th className="px-4 py-3 font-medium">Operator</th>
                    <th className="px-4 py-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActions.map((entry, index) => (
                    <tr key={`${entry.at}-${entry.action}-${index}`} className="border-b border-white/5 last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {PLATFORM_AUDIT_ACTION_LABELS[entry.action as keyof typeof PLATFORM_AUDIT_ACTION_LABELS] ??
                          entry.action}
                      </td>
                      <td className="px-4 py-3 text-white/60">
                        {entry.clubSlug ? `/${entry.clubSlug}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-white/60">{entry.actorEmail}</td>
                      <td className="px-4 py-3 text-white/60">{formatPlatformDate(entry.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
