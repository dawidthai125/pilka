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

export function PlatformDashboardView({ data }: { data: PlatformDashboardData }) {
  const {
    kpi,
    platformHealth,
    clubsRequiringAttention,
    topAlerts,
    onboardingNeedingAction,
    recentSyncs,
    recentActions,
  } = data;

  const criticalAlertCount = topAlerts.filter((a) => a.severity === "CRITICAL").length;

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Kluby łącznie", value: kpi.totalClubs },
          { label: "Aktywne", value: kpi.activeClubs },
          { label: "Onboarding", value: kpi.onboardingClubs },
          { label: "Aktywne ligi", value: kpi.activeLeagues },
        ].map(({ label, value }) => (
          <Card key={label} className="border-white/10 bg-white/5 text-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-white/45">{label}</CardTitle>
            </CardHeader>
            <CardContent className="text-3xl font-bold tabular-nums">{value}</CardContent>
          </Card>
        ))}
      </div>

      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Szybkie akcje</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { href: "/platform/clubs", label: "Wszystkie kluby" },
            { href: "/platform/monitoring", label: "Monitoring Center" },
            {
              href: "/platform/monitoring",
              label: "Alerty krytyczne",
              hint: criticalAlertCount > 0 ? String(criticalAlertCount) : undefined,
            },
            { href: "/platform/clubs?status=attention", label: "Kluby wymagające uwagi" },
          ].map(({ href, label, hint }) => (
            <Link
              key={label}
              href={href}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-[#041810] px-3 py-1.5 text-xs font-medium text-white/85 transition hover:border-[var(--club-secondary,#F4C430)]/40 hover:text-white"
            >
              {label}
              {hint ? (
                <span className="rounded-full bg-red-500/20 px-1.5 py-0.5 text-[10px] font-bold text-red-200">
                  {hint}
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">
            Kluby wymagające uwagi
          </h2>
          <Link
            href="/platform/clubs?status=attention"
            className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline"
          >
            Pełny rejestr →
          </Link>
        </div>
        {clubsRequiringAttention.length === 0 ? (
          <p className="rounded-xl border border-emerald-500/20 bg-emerald-950/20 px-4 py-3 text-sm text-emerald-100/85">
            Brak klubów wymagających natychmiastowej uwagi.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-sm text-white">
              <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-white/45">
                <tr>
                  <th className="px-4 py-3">Klub</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Główny problem</th>
                  <th className="px-4 py-3 text-right">Akcja</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/8">
                {clubsRequiringAttention.map((club) => (
                  <tr key={club.id} className="hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-medium">{club.publicName}</td>
                    <td className="px-4 py-3 text-white/70">
                      {STATUS_LABELS[club.status] ?? club.status}
                    </td>
                    <td className="px-4 py-3">
                      <HealthLevelBadge level={club.healthLevel} />
                    </td>
                    <td className="px-4 py-3 tabular-nums font-semibold">{club.healthScore}</td>
                    <td className="max-w-xs px-4 py-3 text-white/60">{club.mainProblem}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Link
                          href={`/platform/monitoring?clubId=${club.id}`}
                          className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline"
                        >
                          Monitoring
                        </Link>
                        <Link
                          href={`/platform/clubs/${club.id}`}
                          className="text-xs text-white/55 hover:text-white/80 hover:underline"
                        >
                          Szczegóły
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">
            Najważniejsze alerty
          </h2>
          <Link href="/platform/monitoring" className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline">
            Monitoring →
          </Link>
        </div>
        {topAlerts.length === 0 ? (
          <p className="text-sm text-white/50">Brak aktywnych alertów platformy.</p>
        ) : (
          <ul className="space-y-2">
            {topAlerts.map((alert, index) => (
              <li key={`${alert.title}-${index}`}>
                <Link
                  href={alert.monitoringHref}
                  className="block rounded-xl border border-white/10 bg-white/5 p-3 transition hover:bg-white/10"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <span
                      className={cn(
                        "text-xs font-bold uppercase",
                        SEVERITY_STYLES[alert.severity],
                      )}
                    >
                      {alert.severity}
                    </span>
                    <span className="min-w-0 flex-1 font-medium text-white">{alert.title}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/55 line-clamp-2">{alert.description}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">
            Onboarding wymagający działań
          </h2>
          <Link href="/platform/clubs?status=onboarding" className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline">
            Wszystkie w onboardingu →
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
                        Kontynuuj onboarding
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Platform Health</h2>
          <Link href="/platform/audit" className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline">
            Audit Center →
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Aktywne kluby", value: platformHealth.activeClubs },
            { label: "Onboarding", value: platformHealth.onboardingClubs },
            { label: "Kluby HEALTHY", value: platformHealth.healthyClubs, tone: "healthy" as const },
            { label: "Kluby WARNING", value: platformHealth.warningClubs, tone: "warning" as const },
            { label: "Kluby CRITICAL", value: platformHealth.criticalClubs, tone: "critical" as const },
          ].map(({ label, value, tone }) => (
            <Card key={label} className="border-white/10 bg-white/5 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-white/45">{label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p
                  className={cn(
                    "text-3xl font-bold tabular-nums",
                    tone === "healthy" && value > 0 && "text-emerald-300",
                    tone === "warning" && value > 0 && "text-amber-300",
                    tone === "critical" && value > 0 && "text-red-300",
                  )}
                >
                  {value}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Ostatnie synchronizacje</h2>
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
                      <Link href={`/platform/clubs/${sync.clubId}/league`} className="font-medium hover:underline">
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Ostatnie operacje platformy</h2>
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
      </section>
    </div>
  );
}
