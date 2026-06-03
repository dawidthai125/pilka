import Link from "next/link";

import { listPlatformClubs } from "@/lib/platform/onboarding-status";
import { ClubDirectoryFilters, ClubDirectoryTable } from "@/features/platform/components/club-directory-table";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { buttonVariants } from "@/components/ui/button";

type Props = { searchParams: Promise<{ status?: string }> };

export default async function PlatformClubsPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const clubs = await listPlatformClubs(status);

  return (
    <PlatformShell title="Kluby" subtitle="Zarządzanie tenantami FC OS — tworzenie i onboarding klubów.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <ClubDirectoryFilters current={status} />
        <Link href="/platform/clubs/new" className={buttonVariants()}>
          + Nowy klub
        </Link>
      </div>
      <ClubDirectoryTable clubs={clubs} />
    </PlatformShell>
  );
}
