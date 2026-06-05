"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  archiveClubAction,
  resendOwnerInviteAction,
  restoreClubAction,
  type PlatformActionState,
} from "@/features/platform/actions";
import {
  formatPlatformDate,
  HealthLevelBadge,
} from "@/features/platform/components/platform-status-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  REGISTRY_PAGE_SIZE_OPTIONS,
  type ClubOperationsRegistryResult,
  type ClubOperationsRegistryRow,
  type ClubRegistryStatusFilter,
} from "@/lib/platform/club-operations-registry";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  active: "Aktywny",
  onboarding: "Onboarding",
  archived: "Archiwum",
};

const FILTER_OPTIONS: { value: ClubRegistryStatusFilter; label: string }[] = [
  { value: "", label: "Wszystkie" },
  { value: "active", label: "Active" },
  { value: "onboarding", label: "Onboarding" },
  { value: "archived", label: "Archived" },
  { value: "attention", label: "Requires Attention" },
];

function registryHref(
  query: ClubOperationsRegistryResult["query"],
  patch: Partial<{
    page: number;
    pageSize: number;
    status: ClubRegistryStatusFilter;
    search: string;
    hideTest: boolean;
  }>,
): string {
  const page = patch.page ?? query.page;
  const pageSize = patch.pageSize ?? query.pageSize;
  const status = patch.status ?? query.status;
  const search = patch.search ?? query.search;
  const hideTest = patch.hideTest ?? query.hideTest;
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 25) params.set("pageSize", String(pageSize));
  if (search) params.set("q", search);
  if (!hideTest) params.set("hideTest", "0");
  const qs = params.toString();
  return qs ? `/platform/clubs?${qs}` : "/platform/clubs";
}

function LifecycleConfirmButton({
  row,
  action,
  label,
  title,
  description,
  confirmLabel,
  tone = "default",
}: {
  row: ClubOperationsRegistryRow;
  action: (_prev: PlatformActionState, formData: FormData) => Promise<PlatformActionState>;
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger" | "restore";
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {} as PlatformActionState);

  useEffect(() => {
    if (state.success) {
      setConfirmOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  const btnClass =
    tone === "danger"
      ? "text-red-300/90 hover:text-red-200"
      : tone === "restore"
        ? "text-emerald-300/90 hover:text-emerald-200"
        : "text-amber-300/90 hover:text-amber-200";

  return (
    <>
      <button type="button" onClick={() => setConfirmOpen(true)} className={cn("text-xs hover:underline", btnClass)}>
        {label}
      </button>
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="max-w-md rounded-xl border border-white/15 bg-[#0a1410] p-5 text-sm text-white shadow-xl"
            role="dialog"
          >
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-2 text-white/65">{description}</p>
            {state.error ? <p className="mt-3 text-red-300">{state.error}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
              >
                Anuluj
              </Button>
              <form action={formAction}>
                <input type="hidden" name="clubId" value={row.id} />
                <Button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    tone === "danger" && "bg-red-700 hover:bg-red-600",
                    tone === "restore" && "bg-emerald-700 hover:bg-emerald-600",
                  )}
                >
                  {pending ? "…" : confirmLabel}
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ArchiveClubButton({ row }: { row: ClubOperationsRegistryRow }) {
  if (row.status !== "active") return null;

  return (
    <LifecycleConfirmButton
      row={row}
      action={archiveClubAction}
      label="Archive"
      title="Archiwizować klub?"
      description={`Klub ${row.publicName} (/${row.slug}) zostanie oznaczony jako archiwum. Strona publiczna i cron sync przestaną działać.`}
      confirmLabel="Archiwizuj"
      tone="danger"
    />
  );
}

function RestoreClubButton({ row }: { row: ClubOperationsRegistryRow }) {
  if (row.status !== "archived") return null;

  return (
    <LifecycleConfirmButton
      row={row}
      action={restoreClubAction}
      label="Restore"
      title="Przywrócić klub do onboardingu?"
      description={`Klub ${row.publicName} wróci do statusu onboarding (nie active). Operator musi ponownie przejść bramki aktywacji.`}
      confirmLabel="Przywróć"
      tone="restore"
    />
  );
}

function ResendOwnerInviteButton({ row }: { row: ClubOperationsRegistryRow }) {
  if (row.ownerStatus === "active") return null;

  return (
    <LifecycleConfirmButton
      row={row}
      action={resendOwnerInviteAction}
      label="Resend invite"
      title="Ponowić zaproszenie właściciela?"
      description={`Wyśle ponownie invite na ${row.ownerEmail ?? "email właściciela"} (Supabase Auth). Działa tylko gdy owner nie ma statusu active.`}
      confirmLabel="Wyślij"
      tone="default"
    />
  );
}

export function ClubOperationsRegistry({ data }: { data: ClubOperationsRegistryResult }) {
  const { rows, summary, pagination, query } = data;
  const statusFilter = query.status;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-2 text-center text-sm sm:grid-cols-5">
        {[
          { label: "Łącznie", value: summary.total },
          { label: "Active", value: summary.active },
          { label: "Onboarding", value: summary.onboarding },
          { label: "Archived", value: summary.archived },
          { label: "Uwaga", value: summary.attention, tone: "attention" as const },
        ].map(({ label, value, tone }) => (
          <div key={label} className="rounded-lg border border-white/10 bg-white/5 px-2 py-2">
            <dt className="text-xs text-white/45">{label}</dt>
            <dd
              className={cn(
                "mt-0.5 text-lg font-semibold tabular-nums",
                tone === "attention" && value > 0 && "text-amber-300",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((f) => (
            <Link
              key={f.value || "all"}
              href={registryHref(query, { status: f.value, page: 1 })}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition",
                statusFilter === f.value
                  ? "bg-[var(--club-secondary,#F4C430)] text-[#041810]"
                  : "bg-white/10 text-white/70 hover:bg-white/15",
              )}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <form
            action="/platform/clubs"
            method="get"
            className="flex min-w-[200px] flex-1 items-center gap-2 sm:max-w-xs"
          >
            {statusFilter ? <input type="hidden" name="status" value={statusFilter} /> : null}
            {query.pageSize !== 25 ? (
              <input type="hidden" name="pageSize" value={String(query.pageSize)} />
            ) : null}
            {!query.hideTest ? <input type="hidden" name="hideTest" value="0" /> : null}
            <span className="sr-only">Szukaj</span>
            <input
              type="search"
              name="q"
              defaultValue={query.search}
              placeholder="Nazwa lub slug…"
              className="h-9 w-full rounded-lg border border-white/15 bg-[#041810] px-3 text-sm text-white placeholder:text-white/35"
            />
            <Button type="submit" variant="outline" className="h-9 border-white/20 bg-transparent text-white">
              Szukaj
            </Button>
          </form>
          <Link
            href={registryHref(query, { hideTest: !query.hideTest, page: 1 })}
            className={cn(
              "rounded-lg border px-3 py-2 text-xs transition",
              query.hideTest
                ? "border-white/15 bg-white/5 text-white/70"
                : "border-sky-500/30 bg-sky-500/10 text-sky-200",
            )}
          >
            {query.hideTest ? "Ukryj testowe: ON" : "Ukryj testowe: OFF"}
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
        <span>
          Wyniki {pagination.totalFiltered === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1}–
          {Math.min(pagination.page * pagination.pageSize, pagination.totalFiltered)} z {pagination.totalFiltered}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <span>Na stronie:</span>
          {REGISTRY_PAGE_SIZE_OPTIONS.map((size) => (
            <Link
              key={size}
              href={registryHref(query, { pageSize: size, page: 1 })}
              className={cn(
                "rounded px-2 py-0.5",
                pagination.pageSize === size
                  ? "bg-white/15 text-white"
                  : "text-white/55 hover:text-white/80",
              )}
            >
              {size}
            </Link>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center text-white/60">
          <p>Brak klubów dla wybranych filtrów.</p>
          <Link href="/platform/clubs/new" className={cn(buttonVariants(), "mt-4 inline-flex")}>
            Utwórz klub
          </Link>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="min-w-[1100px] w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-3 py-3">Klub</th>
                <th className="px-3 py-3">Slug</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Owner</th>
                <th className="px-3 py-3">Health</th>
                <th className="px-3 py-3">Score</th>
                <th className="px-3 py-3">Ostatni sync</th>
                <th className="px-3 py-3">Liga</th>
                <th className="px-3 py-3">Utworzono</th>
                <th className="px-3 py-3 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-white/[0.03]">
                  <td className="px-3 py-3 font-medium">
                    {row.publicName}
                    {row.isTest ? (
                      <span className="ml-2 rounded-full bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-sky-200">
                        test
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-white/70">/{row.slug}</td>
                  <td className="px-3 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs",
                        row.status === "active"
                          ? "bg-emerald-500/15 text-emerald-200"
                          : row.status === "archived"
                            ? "bg-white/10 text-white/50"
                            : "bg-amber-500/15 text-amber-200",
                      )}
                    >
                      {STATUS_LABELS[row.status] ?? row.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-white/70">
                    {row.ownerEmail ?? "—"}
                    {row.ownerStatus ? (
                      <span className="ml-1 text-xs text-white/40">({row.ownerStatus})</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <HealthLevelBadge level={row.healthLevel} />
                  </td>
                  <td className="px-3 py-3">
                    <Link
                      href={`/platform/monitoring?clubId=${row.id}`}
                      className={cn(
                        "font-semibold tabular-nums hover:underline",
                        row.healthLevel === "CRITICAL" && "text-red-300",
                        row.healthLevel === "WARNING" && "text-amber-300",
                        row.healthLevel === "HEALTHY" && "text-emerald-300",
                      )}
                      title="Otwórz Monitoring z filtrem tego klubu"
                    >
                      {row.healthScore}
                    </Link>
                  </td>
                  <td className="px-3 py-3 text-white/60">
                    {row.lastSyncAt ? formatPlatformDate(row.lastSyncAt) : "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-3 text-white/60" title={row.leagueLabel}>
                    {row.leagueLabel}
                  </td>
                  <td className="px-3 py-3 text-white/55">{row.createdAt.slice(0, 10)}</td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/platform/clubs/${row.id}`}
                        className="text-xs text-[var(--club-secondary,#F4C430)] hover:underline"
                      >
                        Szczegóły
                      </Link>
                      <Link
                        href={`/platform/monitoring?clubId=${row.id}`}
                        className="text-xs text-white/55 hover:text-white/80 hover:underline"
                      >
                        Monitoring
                      </Link>
                      <RestoreClubButton row={row} />
                      <ArchiveClubButton row={row} />
                      <ResendOwnerInviteButton row={row} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pagination.totalPages > 1 ? (
        <nav className="flex flex-wrap items-center justify-center gap-2 text-sm" aria-label="Paginacja">
          {pagination.page > 1 ? (
            <Link
              href={registryHref(query, { page: pagination.page - 1 })}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-white/70 hover:bg-white/5"
            >
              ← Poprzednia
            </Link>
          ) : null}
          <span className="tabular-nums text-white/55">
            Strona {pagination.page} / {pagination.totalPages}
          </span>
          {pagination.page < pagination.totalPages ? (
            <Link
              href={registryHref(query, { page: pagination.page + 1 })}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-white/70 hover:bg-white/5"
            >
              Następna →
            </Link>
          ) : null}
        </nav>
      ) : null}

      <p className="text-xs text-white/40">
        Restore: archived → onboarding (nie active). Wymaga hotfix SQL{' '}
        <code className="text-white/55">scripts/sql/hotfix-192b-platform-restore-club.sql</code> na
        Supabase przed pierwszym użyciem.
      </p>
    </div>
  );
}
