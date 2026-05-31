import Link from "next/link";

import { PlayerForm } from "@/features/players/components/player-form";
import { canManagePlayers } from "@/config/permissions";
import { getDashboardContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewPlayerPage() {
  const { access, teams } = await getDashboardContext();

  if (!canManagePlayers(access.roles)) {
    redirect("/players");
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <Link href="/players" className="text-sm text-muted-foreground hover:text-foreground">
          ← Wróć do listy
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Nowy zawodnik</h1>
        <p className="text-sm text-muted-foreground">
          Uzupełnij dane podstawowe, piłkarskie i status zawodnika.
        </p>
      </div>
      <PlayerForm teams={teams} mode="create" />
    </div>
  );
}
