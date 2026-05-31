import type { Json } from "@/types/database";
import { DEFAULT_CLUB_ID } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { AiSuggestionType } from "@/types/ai";
import { buildAiClubContext } from "@/lib/ai/context";

type DetectedSuggestion = {
  suggestionType: AiSuggestionType;
  title: string;
  description: string;
  actionHint: string;
  metadata: Record<string, unknown>;
};

export async function detectAiSuggestions(
  clubId: string = DEFAULT_CLUB_ID,
): Promise<DetectedSuggestion[]> {
  const context = await buildAiClubContext(clubId);
  const suggestions: DetectedSuggestion[] = [];

  const lowAttendance = context.players.lowestAttendance.filter((p) => p.rate < 60);
  if (lowAttendance.length > 0) {
    suggestions.push({
      suggestionType: "low_attendance",
      title: "Niska frekwencja treningowa",
      description: `${lowAttendance.length} zawodników ma frekwencję poniżej 60%.`,
      actionHint: "Skontaktuj się indywidualnie i ustal plan poprawy obecności.",
      metadata: { threshold: 60, playerCount: lowAttendance.length, players: lowAttendance },
    });
  }

  if (context.trainings.missingAvailabilityCount > 0) {
    suggestions.push({
      suggestionType: "missing_availability",
      title: "Brak odpowiedzi zawodników przed treningiem",
      description: `${context.trainings.missingAvailabilityCount} zawodników nie potwierdziło dostępności (status: nie wiem).`,
      actionHint: "Wyślij przypomnienie o potwierdzeniu obecności przed treningiem.",
      metadata: { count: context.trainings.missingAvailabilityCount },
    });
  }

  if (context.players.expiringDocuments > 0) {
    suggestions.push({
      suggestionType: "expiring_documents",
      title: "Wygasające badania / dokumenty",
      description: `${context.players.expiringDocuments} zawodników ma dokumenty wygasające w ciągu 30 dni.`,
      actionHint: "Przypomnij o konieczności odnowienia dokumentacji medycznej.",
      metadata: { daysAhead: 30, playerCount: context.players.expiringDocuments },
    });
  }

  if (context.players.injured >= 3) {
    suggestions.push({
      suggestionType: "high_injuries",
      title: "Podwyższona liczba kontuzji",
      description: `${context.players.injured} zawodników ma status kontuzji w systemie.`,
      actionHint: "Rozważ modyfikację obciążeń treningowych i konsultację z fizjoterapeutą.",
      metadata: { injuredCount: context.players.injured },
    });
  }

  return suggestions;
}

export async function syncAiSuggestions(clubId: string = DEFAULT_CLUB_ID): Promise<number> {
  const detected = await detectAiSuggestions(clubId);
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("ai_suggestions")
    .select("suggestion_type, status")
    .eq("club_id", clubId)
    .eq("status", "open");

  const openTypes = new Set((existing ?? []).map((row) => row.suggestion_type));
  let inserted = 0;

  for (const item of detected) {
    if (openTypes.has(item.suggestionType)) continue;
    const { error } = await supabase.from("ai_suggestions").insert({
      club_id: clubId,
      suggestion_type: item.suggestionType,
      title: item.title,
      description: item.description,
      action_hint: item.actionHint,
      metadata: item.metadata as Json,
      status: "open",
    });
    if (!error) inserted += 1;
  }

  return inserted;
}
