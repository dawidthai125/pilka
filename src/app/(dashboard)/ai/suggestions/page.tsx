import { AiSuggestionsPanel } from "@/features/ai/components/ai-suggestions-panel";
import { getAiSuggestions, getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";
import { syncAiSuggestions } from "@/lib/ai/insights";

export default async function AiSuggestionsPage() {
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  await syncAiSuggestions();
  const suggestions = await getAiSuggestions();

  return <AiSuggestionsPanel suggestions={suggestions} />;
}
