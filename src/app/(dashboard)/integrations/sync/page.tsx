import { SyncErrorsPanel, SyncHistoryPanel } from "@/features/integrations/components/integrations-panels";
import {
  getDashboardContext,
  getIntegrationSyncErrors,
  getIntegrationSyncLogs,
  requireIntegrationReadAccess,
} from "@/lib/auth/session";

export default async function IntegrationsSyncHistoryPage() {
  const { access } = await getDashboardContext();
  requireIntegrationReadAccess(access);

  const [logs, errors] = await Promise.all([
    getIntegrationSyncLogs(access.clubId, 50),
    getIntegrationSyncErrors(access.clubId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Historia synchronizacji</h1>
        <p className="text-sm text-muted-foreground">Logi: źródło, data, użytkownik, rezultat (sukces / częściowy / błąd).</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Wszystkie logi</h2>
        <SyncHistoryPanel logs={logs} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Błędy i ostrzeżenia</h2>
        <SyncErrorsPanel logs={errors} />
      </section>
    </>
  );
}
