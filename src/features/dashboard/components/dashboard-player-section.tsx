import { DocumentAlertsPanel } from "@/features/players/components/document-alerts-panel";
import { getHomeDashboardStats } from "@/lib/auth/session";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export async function DashboardPlayerSection() {
  const { playerCounts } = await getHomeDashboardStats();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Zawodnicy</CardDescription>
        <CardTitle className="text-lg">{playerCounts.total}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{playerCounts.active} aktywnych</p>
      </CardContent>
    </Card>
  );
}

export async function DashboardDocumentAlertsSection() {
  const { documentAlerts } = await getHomeDashboardStats();

  if (documentAlerts.length === 0) return null;

  return <DocumentAlertsPanel alerts={documentAlerts} />;
}

export function DashboardPlayerSectionFallback() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>Zawodnicy</CardDescription>
        <CardTitle className="text-lg">…</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Ładowanie…</p>
      </CardContent>
    </Card>
  );
}
