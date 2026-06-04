import Link from "next/link";

import { OnboardingStatusBadge } from "@/features/platform/components/onboarding-status-grid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformDashboardData } from "@/lib/platform/dashboard";
import { cn } from "@/lib/utils";

function formatDate(value: string) {
  return new Date(value).toLocaleString("pl-PL");
}

function syncStatusClass(status: string) {
  if (status === "completed") return "text-emerald-300";
  if (status === "failed") return "text-red-300";
  if (status === "running") return "text-amber-300";
  return "text-white/60";
}

const ACTION_LABELS: Record<string, string> = {
  club_created: "Utworzenie klubu",
  league_configuration_saved: "Zapis konfiguracji ligi",
  league_sync_activated: "Aktywacja sync ligi",
  club_activated: "Aktywacja klubu",
};

export function PlatformDashboardView({ data }: { data: PlatformDashboardData }) {
  const { kpi, onboardingClubs, recentSyncs, recentActions } = data;

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
                    <td className="px-4 py-3 text-white/60">{formatDate(club.createdAt)}</td>
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
                    <td className="px-4 py-3 text-white/60">{formatDate(sync.createdAt)}</td>
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
                    <td className="px-4 py-3 font-medium">{ACTION_LABELS[entry.action] ?? entry.action}</td>
                    <td className="px-4 py-3 text-white/60">
                      {entry.clubSlug ? `/${entry.clubSlug}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-white/60">{entry.actorEmail}</td>
                    <td className="px-4 py-3 text-white/60">{formatDate(entry.at)}</td>
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
