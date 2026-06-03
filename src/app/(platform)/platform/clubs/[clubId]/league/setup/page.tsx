import Link from "next/link";
import { notFound } from "next/navigation";

import { LeagueSetupWizard } from "@/features/platform/components/league-setup-wizard";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { loadLeagueSetupSnapshot } from "@/lib/platform/league-setup";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: Promise<{ clubId: string }> };

export default async function PlatformClubLeagueSetupPage({ params }: Props) {
  const { clubId } = await params;
  const snapshot = await loadLeagueSetupSnapshot(clubId);
  if (!snapshot) notFound();

  return (
    <PlatformShell title="League Setup" subtitle={`${snapshot.clubName} · konfiguracja ligi bez JSON/CLI`}>
      <div className="space-y-6">
        <Link
          href={`/platform/clubs/${clubId}/league`}
          className={buttonVariants({ variant: "outline", className: "border-white/20 bg-transparent text-white hover:bg-white/10" })}
        >
          ← League Status
        </Link>
        <LeagueSetupWizard clubId={clubId} clubName={snapshot.clubName} initialSnapshot={snapshot} />
      </div>
    </PlatformShell>
  );
}
