import { CommunicationAiPanel } from "@/features/communication/components/communication-ai-panel";
import { canCreateCommunication } from "@/config/permissions";
import { getDashboardContext, requireCommunicationReadAccess } from "@/lib/auth/session";

export default async function CommunicationAiPage() {
  const { access } = await getDashboardContext();
  requireCommunicationReadAccess(access);

  if (!canCreateCommunication(access.roles)) {
    return (
      <p className="text-sm text-muted-foreground">Brak uprawnień do generatora AI.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Communication Assistant</h1>
        <p className="text-sm text-muted-foreground">Szkice ogłoszeń i komunikatów — wymagają ręcznej publikacji.</p>
      </div>
      <CommunicationAiPanel />
    </div>
  );
}
