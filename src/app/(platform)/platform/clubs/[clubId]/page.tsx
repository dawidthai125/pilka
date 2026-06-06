import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";

import { getPlatformClubDetail } from "@/lib/platform/onboarding-status";
import { evaluateClubActivationGates } from "@/lib/platform/club-activation";
import { ClubActivationCard } from "@/features/platform/components/club-activation-card";
import { ClubLifecycleActionBar } from "@/features/platform/components/club-lifecycle-actions";
import { OnboardingStatusGrid, OnboardingStatusBadge } from "@/features/platform/components/onboarding-status-grid";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { buttonVariants } from "@/components/ui/button";

type Props = { params: Promise<{ clubId: string }> };

export default async function PlatformClubDetailPage({ params }: Props) {
  const { clubId } = await params;
  const club = await getPlatformClubDetail(clubId);
  if (!club) notFound();

  const activationGates = await evaluateClubActivationGates(clubId);

  return (
    <PlatformShell title={club.publicName} subtitle={`/${club.slug} · status: ${club.status}`}>
      <div className="space-y-8">
        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Onboarding</h2>
          <div className="mt-2 flex items-center gap-3">
            <OnboardingStatusBadge status={club.onboarding.overall} />
            <span className="text-sm text-white/60">Ogólny postęp konfiguracji klubu</span>
          </div>
          <div className="mt-4">
            <OnboardingStatusGrid onboarding={club.onboarding} />
          </div>
        </section>

        {activationGates ? (
          <section>
            <ClubActivationCard gates={activationGates} />
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/45">Właściciel</p>
            <p className="mt-1 font-medium">{club.ownerEmail ?? "Brak przypisania"}</p>
            {club.ownerStatus ? <p className="text-xs text-white/45">Status: {club.ownerStatus}</p> : null}
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-white/45">Utworzono</p>
            <p className="mt-1 font-medium">{new Date(club.createdAt).toLocaleString("pl-PL")}</p>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/5 p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Operacje lifecycle</h2>
          <p className="mt-1 text-xs text-white/50">Te same akcje co w rejestrze klubów — archiwizacja, przywracanie, zaproszenie.</p>
          <div className="mt-4">
            <ClubLifecycleActionBar
              row={{
                id: club.id,
                slug: club.slug,
                publicName: club.publicName,
                status: club.status,
                ownerEmail: club.ownerEmail,
                ownerStatus: club.ownerStatus,
              }}
            />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/platform/clubs"
            className={buttonVariants({ variant: "outline", className: "border-white/20 bg-transparent text-white hover:bg-white/10" })}
          >
            ← Lista klubów
          </Link>
          <Link
            href={`/platform/clubs/${clubId}/league/setup`}
            className={buttonVariants({ variant: "outline", className: "border-white/20 bg-transparent text-white hover:bg-white/10" })}
          >
            Konfiguracja ligi
          </Link>
          <Link
            href={`/platform/clubs/${clubId}/league`}
            className={buttonVariants({ variant: "outline", className: "border-white/20 bg-transparent text-white hover:bg-white/10" })}
          >
            Status ligi
          </Link>
          <Link href={club.publicUrl} target="_blank" className={buttonVariants({ className: "inline-flex items-center" })}>
            <ExternalLink className="mr-2 size-4" />
            Strona publiczna
          </Link>
        </div>
      </div>
    </PlatformShell>
  );
}
