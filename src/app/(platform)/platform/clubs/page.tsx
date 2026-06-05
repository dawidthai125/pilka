import Link from "next/link";
import { Suspense } from "react";

import { ClubOperationsRegistry } from "@/features/platform/components/club-operations-registry";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { buttonVariants } from "@/components/ui/button";
import {
  loadClubOperationsRegistryPage,
  REGISTRY_PAGE_SIZE_OPTIONS,
  type ClubRegistryStatusFilter,
} from "@/lib/platform/club-operations-registry";

type Props = {
  searchParams: Promise<{
    status?: string;
    page?: string;
    pageSize?: string;
    q?: string;
    hideTest?: string;
  }>;
};

function parseStatus(value?: string): ClubRegistryStatusFilter {
  if (value === "active" || value === "onboarding" || value === "archived" || value === "attention") {
    return value;
  }
  return "";
}

function parsePageSize(value?: string): number {
  const n = Number(value);
  return (REGISTRY_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : 25;
}

export default async function PlatformClubsPage({ searchParams }: Props) {
  const params = await searchParams;
  const status = parseStatus(params.status);
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = parsePageSize(params.pageSize);
  const search = params.q?.trim() ?? "";
  const hideTest = params.hideTest !== "0";

  const data = await loadClubOperationsRegistryPage({
    page,
    pageSize,
    status,
    search,
    hideTest,
  });

  return (
    <PlatformShell
      title="Kluby"
      subtitle="Rejestr operacyjny — status, health i synchronizacje bez przechodzenia do Monitoring Center."
    >
      <div className="mb-6 flex flex-wrap items-center justify-end gap-4">
        <Link href="/platform/clubs/new" className={buttonVariants()}>
          + Nowy klub
        </Link>
      </div>
      <Suspense fallback={<p className="text-sm text-white/50">Ładowanie rejestru…</p>}>
        <ClubOperationsRegistry data={data} />
      </Suspense>
    </PlatformShell>
  );
}
