import { IntegrationsPanel } from "@/features/matches/components/integrations-panel";
import { getDashboardContext, requireMatchReadAccess } from "@/lib/auth/session";

export default async function IntegrationsPage() {
  const { access } = await getDashboardContext();
  requireMatchReadAccess(access);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integracje</h1>
        <p className="text-sm text-muted-foreground">
          Warstwa pod przyszłą synchronizację z PZPN, DZPN i Extranet — bez pobierania danych w ETAP 4.
        </p>
      </div>
      <IntegrationsPanel />
    </div>
  );
}
