import { TalentRankingPanel } from "@/features/academy/components/academy-panels";
import { getTalentRanking, requireAcademyReadAccess } from "@/lib/academy/loaders";
import { getDashboardContext } from "@/lib/auth/session";
import { canReadAcademy } from "@/config/permissions";
import { redirect } from "next/navigation";

export default async function AcademyTalentsPage() {
  const { access } = await getDashboardContext();
  requireAcademyReadAccess(access);
  if (!canReadAcademy(access.roles)) redirect("/academy/development");

  const ranking = await getTalentRanking(access.clubId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Ranking talentów</h1>
        <p className="text-sm text-muted-foreground">
          Na podstawie ocen, potencjału, frekwencji i postępów rozwoju (max 100 zawodników).
        </p>
      </div>
      <TalentRankingPanel ranking={ranking} />
    </>
  );
}
