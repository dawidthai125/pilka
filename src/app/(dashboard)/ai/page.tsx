import { AiDashboard } from "@/features/ai/components/ai-dashboard";
import { canManageAi } from "@/config/permissions";
import { getAiSuggestions, getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";
import { syncAiSuggestions } from "@/lib/ai/insights";
import { isOpenAiConfigured } from "@/integrations/openai";

export default async function AiPage() {
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  await syncAiSuggestions();
  const suggestions = await getAiSuggestions();

  return (
    <AiDashboard
      openSuggestions={suggestions}
      canManage={canManageAi(access.roles)}
      openAiConfigured={isOpenAiConfigured()}
    />
  );
}
