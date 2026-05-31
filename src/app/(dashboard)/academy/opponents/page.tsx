import { OpponentsPanel } from "@/features/academy/components/academy-panels";
import { canManageScouting, canReadScouting } from "@/config/permissions";
import { getOpponentAnalyses, getScoutingClubs, requireAcademyReadAccess } from "@/lib/academy/loaders";
import { getDashboardContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AcademyOpponentsPage() {
  const { access } = await getDashboardContext();
  requireAcademyReadAccess(access);
  if (!canReadScouting(access.roles)) redirect("/academy/development");

  const [analyses, clubs] = await Promise.all([
    getOpponentAnalyses(access.clubId),
    getScoutingClubs(access.clubId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Analiza przeciwników</h1>
        <p className="text-sm text-muted-foreground">Mocne i słabe strony, kluczowi zawodnicy, taktyka.</p>
      </div>
      <OpponentsPanel analyses={analyses} clubs={clubs} canManage={canManageScouting(access.roles)} />
    </>
  );
}
