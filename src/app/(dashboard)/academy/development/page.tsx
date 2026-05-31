import { DevelopmentPlayersList } from "@/features/academy/components/academy-panels";
import { requireAcademyReadAccess, resolveOwnPlayerIds } from "@/lib/academy/loaders";
import { canReadAcademy } from "@/config/permissions";
import { getDashboardContext, getPlayers } from "@/lib/auth/session";

export default async function AcademyDevelopmentPage() {
  const { access } = await getDashboardContext();
  requireAcademyReadAccess(access);

  let players = await getPlayers(access.clubId);
  if (!canReadAcademy(access.roles)) {
    const ownIds = await resolveOwnPlayerIds(access);
    players = players.filter((p) => ownIds.includes(p.id));
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Rozwój zawodników</h1>
        <p className="text-sm text-muted-foreground">Profile rozwoju, oceny, cele i testy motoryczne.</p>
      </div>
      <DevelopmentPlayersList players={players} />
    </>
  );
}
