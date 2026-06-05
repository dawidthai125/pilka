import Link from "next/link";
import { Suspense } from "react";

import { ClubOperationsRegistry } from "@/features/platform/components/club-operations-registry";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { buttonVariants } from "@/components/ui/button";
import { loadClubOperationsRegistry } from "@/lib/platform/club-operations-registry";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function PlatformClubsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const rows = await loadClubOperationsRegistry();

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
        <ClubOperationsRegistry rows={rows} initialStatusFilter={status} />
      </Suspense>
    </PlatformShell>
  );
}
