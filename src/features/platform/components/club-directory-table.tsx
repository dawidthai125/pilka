import Link from "next/link";

import type { PlatformClubListItem } from "@/lib/platform/onboarding-status";
import { OnboardingStatusBadge } from "@/features/platform/components/onboarding-status-grid";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktywny",
  onboarding: "Onboarding",
  archived: "Archiwum",
};

export function ClubDirectoryTable({ clubs }: { clubs: PlatformClubListItem[] }) {
  if (clubs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-white/60">
        <p>Brak klubów w tej kategorii.</p>
        <Link href="/platform/clubs/new" className={buttonVariants()}>
          Utwórz pierwszy klub
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-[720px] w-full text-left text-sm">
        <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-white/45">
          <tr>
            <th className="px-4 py-3">Klub</th>
            <th className="px-4 py-3">Slug</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Onboarding</th>
            <th className="px-4 py-3">Właściciel</th>
            <th className="px-4 py-3">Utworzono</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {clubs.map((club) => (
            <tr key={club.id} className="hover:bg-white/[0.03]">
              <td className="px-4 py-3 font-medium">{club.publicName}</td>
              <td className="px-4 py-3 font-mono text-white/70">{club.slug}</td>
              <td className="px-4 py-3">
                <span className={cn("rounded-full px-2 py-0.5 text-xs", club.status === "active" ? "bg-emerald-500/15 text-emerald-200" : "bg-white/10 text-white/60")}>
                  {STATUS_LABELS[club.status] ?? club.status}
                </span>
              </td>
              <td className="px-4 py-3">
                <OnboardingStatusBadge status={club.onboarding.overall} />
              </td>
              <td className="px-4 py-3 text-white/70">
                {club.ownerEmail ?? "—"}
                {club.ownerStatus ? <span className="ml-1 text-xs text-white/40">({club.ownerStatus})</span> : null}
              </td>
              <td className="px-4 py-3 text-white/55">{club.createdAt.slice(0, 10)}</td>
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
  );
}

export function ClubDirectoryFilters({ current }: { current?: string }) {
  const filters = [
    { value: "", label: "Wszystkie" },
    { value: "active", label: "Aktywne" },
    { value: "onboarding", label: "Onboarding" },
    { value: "archived", label: "Archiwum" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((f) => (
        <Link
          key={f.value || "all"}
          href={f.value ? `/platform/clubs?status=${f.value}` : "/platform/clubs"}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition",
            (current ?? "") === f.value ? "bg-[var(--club-secondary,#F4C430)] text-[#041810]" : "bg-white/10 text-white/70 hover:bg-white/15",
          )}
        >
          {f.label}
        </Link>
      ))}
    </div>
  );
}
