import {
  ClubMappingsPanel,
  ConflictsPanel,
  TeamMappingsPanel,
} from "@/features/integrations/components/integrations-panels";
import { canManageIntegrations } from "@/config/permissions";
import {
  getDashboardContext,
  getExternalTeamsForIntegrations,
  getIntegrationClubMappings,
  getIntegrationConflicts,
  getTeams,
  requireIntegrationReadAccess,
} from "@/lib/auth/session";

export default async function IntegrationsMappingsPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);

  const [mappings, externalTeams, teams, conflicts] = await Promise.all([
    getIntegrationClubMappings(access.clubId),
    getExternalTeamsForIntegrations(access.clubId),
    getTeams(access.clubId),
    getIntegrationConflicts(access.clubId, true),
  ]);

  const canManage = canManageIntegrations(access.roles);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Mapowania</h1>
        <p className="text-sm text-muted-foreground">
          Połączenie nazw klubu (Piorun Wawrzeńczyce ↔ GLKS Mietków) i drużyn wiekowych z identyfikatorami zewnętrznymi.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mapowanie klubu</h2>
        <ClubMappingsPanel mappings={mappings} canManage={canManage} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Mapowanie drużyn</h2>
        <TeamMappingsPanel externalTeams={externalTeams} teams={teams} canManage={canManage} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Konflikty danych</h2>
        <ConflictsPanel conflicts={conflicts} canManage={canManage} />
      </section>
    </>
  );
}
