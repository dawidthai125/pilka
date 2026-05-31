import {
  ConflictsPanel,
  IntegrationProviderCards,
  IntegrationStatsCards,
  SyncErrorsPanel,
} from "@/features/integrations/components/integrations-panels";
import {
  canManageIntegrations,
} from "@/config/permissions";
import {
  getDashboardContext,
  getIntegrationConflicts,
  getIntegrationDashboardStats,
  getIntegrationSyncErrors,
  getIntegrationsForClub,
  requireIntegrationReadAccess,
} from "@/lib/auth/session";

export default async function IntegrationsPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);

  const [stats, integrations, errors, conflicts] = await Promise.all([
    getIntegrationDashboardStats(access.clubId),
    getIntegrationsForClub(access.clubId),
    getIntegrationSyncErrors(access.clubId),
    getIntegrationConflicts(access.clubId, true),
  ]);

  const canManage = canManageIntegrations(access.roles);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Integracje rozgrywkowe</h1>
        <p className="text-sm text-muted-foreground">
          Warstwa pod PZPN, DZPN, Extranet i importy — system działa bez live API (staging + pliki).
        </p>
      </div>

      <IntegrationStatsCards stats={stats} />
      <IntegrationProviderCards integrations={integrations} canManage={canManage} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ostatnie błędy synchronizacji</h2>
        <SyncErrorsPanel logs={errors.slice(0, 5)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Konflikty do rozstrzygnięcia</h2>
        <ConflictsPanel conflicts={conflicts} canManage={canManage} />
      </section>
    </>
  );
}
