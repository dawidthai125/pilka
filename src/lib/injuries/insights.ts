import type {
  InjuryAiInsight,
  InjuryDashboardStats,
  PlayerInjuryHistorySummary,
  PlayerInjuryRow,
} from "@/types/injuries";
import { computeAbsenceDays } from "@/lib/injuries/mappers";

export function generateInjuryInsights(
  stats: InjuryDashboardStats,
  injuries: PlayerInjuryRow[],
  history: PlayerInjuryHistorySummary[],
): InjuryAiInsight[] {
  const insights: InjuryAiInsight[] = [];

  const longAbsences = injuries.filter((i) => {
    if (i.injuryStatus === "closed") return false;
    return computeAbsenceDays(i) >= 21;
  });
  if (longAbsences.length) {
    insights.push({
      id: "long-absence",
      title: "Długie absencje",
      body: `${longAbsences.length} zawodników z absencją powyżej 21 dni. Rozważ rotację kadry i indywidualny plan powrotu.`,
      severity: "warning",
    });
  }

  const frequent = history.filter((h) => h.injuryCount >= 3);
  if (frequent.length) {
    insights.push({
      id: "frequent-injuries",
      title: "Częste urazy",
      body: `${frequent.map((h) => h.playerName).slice(0, 3).join(", ")} — wielokrotne wpisy w historii. Monitoruj obciążenie treningowe.`,
      severity: "warning",
    });
  }

  if (stats.unavailablePlayers >= 3) {
    insights.push({
      id: "squad-risk",
      title: "Ryzyko braków kadrowych",
      body: `${stats.unavailablePlayers} zawodników oznaczonych jako niedostępni z powodu urazu. Sprawdź skład na nadchodzące mecze.`,
      severity: "critical",
    });
  }

  const returningSoon = injuries.filter(
    (i) =>
      i.expectedReturnDate &&
      i.injuryStatus !== "closed" &&
      new Date(i.expectedReturnDate).getTime() - Date.now() < 7 * 86400000,
  );
  if (returningSoon.length) {
    insights.push({
      id: "return-soon",
      title: "Planowane powroty",
      body: `${returningSoon.length} zawodników z przewidywanym powrotem w ciągu 7 dni — przygotuj progresję obciążeń.`,
      severity: "info",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "all-clear",
      title: "Brak istotnych alertów",
      body: "AI nie wykryło krytycznych wzorców urazowych. Kontynuuj monitoring dostępności.",
      severity: "info",
    });
  }

  return insights;
}
