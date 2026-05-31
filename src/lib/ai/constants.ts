import type {
  AiReportCategory,
  AiReportType,
  AiReportStatus,
  AiSuggestionType,
} from "@/types/ai";

export const AI_REPORT_CATEGORY_LABELS: Record<AiReportCategory, string> = {
  matches: "Mecze",
  trainings: "Treningi",
  players: "Zawodnicy",
  management: "Zarząd",
  sponsors: "Sponsorzy",
  finance: "Finanse klubu",
  inventory: "Magazyn klubu",
};

export const AI_REPORT_TYPE_LABELS: Record<AiReportType, string> = {
  match_summary: "Raport meczowy",
  training_weekly: "Raport treningowy (tydzień)",
  management_monthly: "Raport zarządu (miesiąc)",
  social_facebook: "Post Facebook",
  social_instagram: "Post Instagram",
  social_website: "Komunikat strona klubowa",
  social_round: "Podsumowanie kolejki",
};

export const AI_REPORT_STATUS_LABELS: Record<AiReportStatus, string> = {
  draft: "Szkic",
  published: "Opublikowany",
  archived: "Zarchiwizowany",
};

export const AI_SUGGESTION_TYPE_LABELS: Record<AiSuggestionType, string> = {
  low_attendance: "Niska frekwencja",
  missing_availability: "Brak odpowiedzi",
  expiring_documents: "Wygasające dokumenty",
  high_injuries: "Kontuzje",
};

export const AI_SPORTS_CATEGORIES: AiReportCategory[] = ["matches", "trainings", "players"];

export const AI_ASSISTANT_NAME = "Club AI Assistant";

export const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";

export const AI_MAX_MESSAGE_LENGTH = 4000;

export const AI_MAX_HISTORY_MESSAGES = 20;

export function buildAiSystemPrompt(clubName: string): string {
  return `Jesteś Club AI Assistant — asystentem klubu piłkarskiego ${clubName}.
Odpowiadaj WYŁĄCZNIE na podstawie danych klubu przekazanych w kontekście JSON.
Jeśli brakuje danych — powiedz wprost, że nie masz informacji w systemie.
Nie wymyślaj statystyk, wyników ani zawodników.
Nie odwołuj się do innych klubów ani danych spoza kontekstu.
Odpowiadaj po polski, zwięźle i merytorycznie.`;
}
