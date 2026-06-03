import Link from "next/link";
import { notFound } from "next/navigation";

import { LeagueStatusPanel } from "@/features/platform/components/league-status-panel";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { loadLeagueSetupSnapshot } from "@/lib/platform/league-setup";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: Promise<{ clubId: string }> };

export default async function PlatformClubLeaguePage({ params }: Props) {
  const { clubId } = await params;
  const snapshot = await loadLeagueSetupSnapshot(clubId);
  if (!snapshot) notFound();

  return (
    <PlatformShell title="League Status" subtitle={`${snapshot.clubName} · /${snapshot.clubSlug}`}>
      <div className="space-y-6">
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/platform/clubs/${clubId}`}
            className={buttonVariants({ variant: "outline", className: "border-white/20 bg-transparent text-white hover:bg-white/10" })}
          >
            ← Onboarding klubu
          </Link>
          <Link href={`/platform/clubs/${clubId}/league/setup`} className={buttonVariants({ size: "sm" })}>
            League Setup
          </Link>
        </div>
        <LeagueStatusPanel snapshot={snapshot} />
      </div>
    </PlatformShell>
  );
}
