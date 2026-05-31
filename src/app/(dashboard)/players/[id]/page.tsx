import Link from "next/link";
import { notFound } from "next/navigation";

import { PlayerDetailView } from "@/features/players/components/player-detail-view";
import { PlayerForm } from "@/features/players/components/player-form";
import { canAccessCoachNotes, canManagePlayers } from "@/config/permissions";
import {
  getDashboardContext,
  getPlayerDetail,
  requirePlayerReadAccess,
} from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PlayerDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; tab?: string }>;
}) {
  const { id } = await params;
  const { edit, tab } = await searchParams;
  const { access, teams } = await getDashboardContext();
  requirePlayerReadAccess(access);

  const data = await getPlayerDetail(id);
  if (!data) notFound();

  const canManage = canManagePlayers(access.roles);
  const canViewNotes = canAccessCoachNotes(access.roles);

  if (edit === "1" && canManage) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <Link href={`/players/${id}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Wróć do profilu
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edycja zawodnika</h1>
        </div>
        <PlayerForm teams={teams} player={data.player} mode="edit" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-wrap gap-2">
        <Link href="/players" className="text-sm text-muted-foreground hover:text-foreground">
          ← Lista zawodników
        </Link>
        {canManage ? (
          <Link
            href={`/players/${id}?edit=1`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "ml-auto")}
          >
            Edytuj dane
          </Link>
        ) : null}
      </div>
      <PlayerDetailView
        data={data}
        canManage={canManage}
        canViewNotes={canViewNotes}
        initialTab={tab}
      />
    </div>
  );
}
