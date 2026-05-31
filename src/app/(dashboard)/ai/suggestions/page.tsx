import { AiSuggestionsPanel } from "@/features/ai/components/ai-suggestions-panel";
import { getAiSuggestions, getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";

export default async function AiSuggestionsPage() {
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  const suggestions = await getAiSuggestions();

  return <AiSuggestionsPanel suggestions={suggestions} />;
}
