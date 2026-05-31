import { ProviderDetailPanel, PZPN_API_NOTE } from "@/features/integrations/components/integrations-panels";
import { canManageIntegrations } from "@/config/permissions";
import { getDashboardContext, getIntegrationByProvider, requireIntegrationReadAccess } from "@/lib/auth/session";

export default async function PzpnIntegrationPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);
  const integration = await getIntegrationByProvider("pzpn", access.clubId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Integracja PZPN</h1>
        <p className="text-sm text-muted-foreground">Terminarze i rozgrywki centralne — adapter API gotowy pod przyszłe podłączenie.</p>
      </div>
      <ProviderDetailPanel
        provider="pzpn"
        integration={integration}
        canManage={canManageIntegrations(access.roles)}
        apiNote={PZPN_API_NOTE}
      />
    </>
  );
}
