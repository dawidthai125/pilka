import { ProviderDetailPanel, DZPN_API_NOTE } from "@/features/integrations/components/integrations-panels";
import { canManageIntegrations } from "@/config/permissions";
import { getDashboardContext, getIntegrationByProvider, requireIntegrationReadAccess } from "@/lib/auth/session";

export default async function DzpnIntegrationPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);
  const integration = await getIntegrationByProvider("dzpn", access.clubId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Integracja DZPN</h1>
        <p className="text-sm text-muted-foreground">Tabela ligi, terminarz i wyniki — import CSV/JSON lub staging w bazie.</p>
      </div>
      <ProviderDetailPanel
        provider="dzpn"
        integration={integration}
        canManage={canManageIntegrations(access.roles)}
        apiNote={DZPN_API_NOTE}
      />
    </>
  );
}
