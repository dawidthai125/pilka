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

export const AI_SYSTEM_PROMPT = `Jesteś Club AI Assistant — asystentem klubu piłkarskiego Piorun Wawrzeńczyce.
Odpowiadaj WYŁĄCZNIE na podstawie danych klubu przekazanych w kontekście JSON.
Jeśli brakuje danych — powiedz wprost, że nie masz informacji w systemie.
Nie wymyślaj statystyk, wyników ani zawodników.
Odpowiadaj po polsku, zwięźle i merytorycznie.`;
