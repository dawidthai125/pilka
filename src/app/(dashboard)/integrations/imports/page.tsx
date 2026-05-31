import { ImportPanel, ImportsHistoryPanel } from "@/features/integrations/components/integrations-panels";
import { canManageIntegrations } from "@/config/permissions";
import { getDashboardContext, getIntegrationImports, requireIntegrationReadAccess } from "@/lib/auth/session";

export default async function IntegrationsImportsPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);
  const imports = await getIntegrationImports(access.clubId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Import danych</h1>
        <p className="text-sm text-muted-foreground">CSV i JSON — tabela, terminarz, wyniki. Excel zapisz jako CSV.</p>
      </div>
      <ImportPanel canManage={canManageIntegrations(access.roles)} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historia importów</h2>
        <ImportsHistoryPanel imports={imports} />
      </section>
    </>
  );
}
