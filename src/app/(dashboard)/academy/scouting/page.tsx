import { AcademyAiPrompts, ScoutingPanel } from "@/features/academy/components/academy-panels";
import { canManageScouting, canReadScouting } from "@/config/permissions";
import {
  getScoutingClubs,
  getScoutingPlayers,
  getScoutingReports,
  requireAcademyReadAccess,
} from "@/lib/academy/loaders";
import { getDashboardContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AcademyScoutingPage() {
  const { access } = await getDashboardContext();
  requireAcademyReadAccess(access);
  if (!canReadScouting(access.roles)) redirect("/academy/development");

  const [players, reports, clubs] = await Promise.all([
    getScoutingPlayers(access.clubId),
    getScoutingReports(access.clubId),
    getScoutingClubs(access.clubId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Skauting</h1>
        <p className="text-sm text-muted-foreground">Obserwowani zawodnicy, raporty i baza klubów.</p>
      </div>
      <ScoutingPanel
        players={players}
        reports={reports}
        clubs={clubs}
        canManage={canManageScouting(access.roles)}
      />
      <AcademyAiPrompts category="scouting" />
    </>
  );
}
