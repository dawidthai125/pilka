import { ProviderDetailPanel } from "@/features/integrations/components/integrations-panels";
import { canManageIntegrations } from "@/config/permissions";
import { getDashboardContext, getIntegrationByProvider, requireIntegrationReadAccess } from "@/lib/auth/session";

export default async function ExtranetIntegrationPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);
  const integration = await getIntegrationByProvider("extranet", access.clubId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Integracja Extranet</h1>
        <p className="text-sm text-muted-foreground">Wysyłka raportów meczowych do systemu rozgrywkowego.</p>
      </div>
      <ProviderDetailPanel
        provider="extranet"
        integration={integration}
        canManage={canManageIntegrations(access.roles)}
        apiNote="Extranet — adapter push raportów meczowych; wymaga konfiguracji URL i klucza API w przyszłości."
      />
    </>
  );
}
