import type { AttendanceAiInsight, PlayerFrequencyStats } from "@/types/attendance";
import type { AttendanceDashboardWidgets } from "@/types/attendance";

export function generateAttendanceInsights(
  widgets: AttendanceDashboardWidgets,
  stats: PlayerFrequencyStats[],
): AttendanceAiInsight[] {
  const insights: AttendanceAiInsight[] = [];

  if (widgets.nextTrainingTotal > 0) {
    const ratio = widgets.nextTrainingAvailable / widgets.nextTrainingTotal;
    if (ratio < 0.6) {
      insights.push({
        id: "low-training-availability",
        title: "Ryzyko braku składu na trening",
        body: `Tylko ${widgets.nextTrainingAvailable}/${widgets.nextTrainingTotal} zawodników zgłosiło dostępność na najbliższy trening. Rozważ przypomnienie w Communication Hub.`,
        severity: "critical",
      });
    }
  }

  const declining = stats.filter((s) => s.monthRate < s.seasonRate - 15);
  if (declining.length) {
    insights.push({
      id: "attendance-decline",
      title: "Spadek frekwencji",
      body: `${declining.length} zawodnik(ów) ma wyraźnie niższą frekwencję w tym miesiącu niż w sezonie. Sprawdź powody nieobecności.`,
      severity: "warning",
    });
  }

  const longAbsent = stats.filter((s) => s.consecutiveAbsences >= 3);
  if (longAbsent.length) {
    insights.push({
      id: "long-absence",
      title: "Długie nieobecności",
      body: `${longAbsent.map((s) => s.playerName).slice(0, 3).join(", ")} — seria nieobecności. Warto kontakt indywidualny.`,
      severity: "warning",
    });
  }

  if (widgets.injuredCount > 0) {
    insights.push({
      id: "injured-roster",
      title: "Kontuzjowani w kadrze",
      body: `${widgets.injuredCount} zawodnik(ów) ma status kontuzji. Dostępnych na mecz: ${widgets.nextMatchAvailable}.`,
      severity: "info",
    });
  }

  if (!insights.length) {
    insights.push({
      id: "all-good",
      title: "Frekwencja stabilna",
      body: "Brak krytycznych alertów. Kontynuuj monitorowanie dostępności przed treningami i meczami.",
      severity: "info",
    });
  }

  return insights;
}
