import Link from "next/link";

import { PlayersList } from "@/features/players/components/players-list";
import { canManagePlayers } from "@/config/permissions";
import {
  getDashboardContext,
  getPlayers,
  requirePlayerReadAccess,
} from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function PlayersPage() {
  const { access } = await getDashboardContext();
  requirePlayerReadAccess(access);

  const players = await getPlayers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Zawodnicy</h1>
          <p className="text-sm text-muted-foreground">
            Zarządzanie kadrą klubu — {players.length} zawodników w systemie.
          </p>
        </div>
        {canManagePlayers(access.roles) ? (
          <Link href="/players/new" className={cn(buttonVariants())}>
            Dodaj zawodnika
          </Link>
        ) : null}
      </div>

      <PlayersList players={players} />
    </div>
  );
}
