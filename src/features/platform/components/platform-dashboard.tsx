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

function syncStatusClass(status: string) {
  if (status === "completed") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  if (status === "running") return "text-amber-300";
  return "text-white/60";
}

export function PlatformDashboardView({ data }: { data: PlatformDashboardData }) {
  const { kpi, platformHealth, onboardingClubs, recentSyncs, recentActions } = data;

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

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Platform Health</h2>
          <div className="flex gap-3 text-xs">
            <Link href="/platform/monitoring" className="text-[var(--club-secondary,#F4C430)] hover:underline">
              Monitoring →
            </Link>
            <Link href="/platform/audit" className="text-[var(--club-secondary,#F4C430)] hover:underline">
              Audit Center →
            </Link>
          </div>
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
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { label: "Ligi HEALTHY", value: platformHealth.healthyLeagues, level: "HEALTHY" as const },
            { label: "Ligi WARNING", value: platformHealth.warningLeagues, level: "WARNING" as const },
            { label: "Ligi CRITICAL", value: platformHealth.criticalLeagues, level: "CRITICAL" as const },
          ].map(({ label, value, level }) => (
            <Card key={label} className="border-white/10 bg-white/5 text-white">
              <CardContent className="flex items-center justify-between pt-6">
                <div>
                  <p className="text-sm text-white/45">{label}</p>
                  <p className="text-2xl font-bold tabular-nums">{value}</p>
                </div>
                {value > 0 ? <HealthLevelBadge level={level} /> : null}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Kluby w onboardingu</h2>
        {onboardingClubs.length === 0 ? (
          <p className="text-sm text-white/50">Brak klubów w onboardingu.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Klub</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Postęp</th>
                  <th className="px-4 py-3 font-medium">Utworzono</th>
                  <th className="px-4 py-3 font-medium" />
                </tr>
              </thead>
              <tbody>
                {onboardingClubs.map((club) => (
                  <tr key={club.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 font-medium">{club.publicName}</td>
                    <td className="px-4 py-3 text-white/60">/{club.slug}</td>
                    <td className="px-4 py-3">
                      <OnboardingStatusBadge status={club.overall as "not_started" | "in_progress" | "complete"} />
                    </td>
                    <td className="px-4 py-3 text-white/60">{formatPlatformDate(club.createdAt)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/platform/clubs/${club.id}`} className="text-[var(--club-secondary,#F4C430)] hover:underline">
                        Szczegóły
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
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Ostatnie synchronizacje</h2>
        {recentSyncs.length === 0 ? (
          <p className="text-sm text-white/50">Brak zadań synchronizacji.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[640px] text-left text-sm">
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
            <table className="w-full min-w-[640px] text-left text-sm">
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
