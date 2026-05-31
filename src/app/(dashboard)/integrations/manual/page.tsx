import { ProviderDetailPanel } from "@/features/integrations/components/integrations-panels";
import { manualAdapter } from "@/integrations/manual";
import { canManageIntegrations } from "@/config/permissions";
import { getDashboardContext, getIntegrationByProvider, requireIntegrationReadAccess } from "@/lib/auth/session";

export default async function ManualIntegrationPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);
  const integration = await getIntegrationByProvider("manual", access.clubId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Ręczne wprowadzanie</h1>
        <p className="text-sm text-muted-foreground">{manualAdapter.label} — bez zewnętrznego API.</p>
      </div>
      <ProviderDetailPanel
        provider="manual"
        integration={integration}
        canManage={canManageIntegrations(access.roles)}
        apiNote="Dane można wprowadzać ręcznie lub importować pliki CSV/JSON w sekcji Importy."
      />
    </>
  );
}
