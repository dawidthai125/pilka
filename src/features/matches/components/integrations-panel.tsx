import { getIntegrationConfigs } from "@/integrations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const labels = { pzpn: "PZPN", dzpn: "DZPN", extranet: "Extranet" } as const;

export function IntegrationsPanel() {
  const configs = getIntegrationConfigs();

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {configs.map((config) => (
        <Card key={config.provider}>
          <CardHeader>
            <CardTitle>{labels[config.provider]}</CardTitle>
            <CardDescription>Integracja przygotowana — synchronizacja w kolejnych etapach.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Badge variant="secondary">Nie skonfigurowano</Badge>
            <p className="text-muted-foreground">Endpoint: {config.baseUrl ?? "—"}</p>
            <p className="text-muted-foreground">Ostatnia synchronizacja: {config.lastSyncAt ?? "—"}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
