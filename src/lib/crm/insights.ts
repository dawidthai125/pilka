import type { CrmAiInsight, CrmDashboardStats, CrmTaskRow } from "@/types/crm";

export function generateCrmInsights(
  stats: CrmDashboardStats,
  openTasks: CrmTaskRow[],
): CrmAiInsight[] {
  const insights: CrmAiInsight[] = [];

  if (stats.openTasks >= 5) {
    insights.push({
      id: "many-open-tasks",
      title: "Dużo otwartych zadań CRM",
      body: `${stats.openTasks} zadań czeka na realizację. Rozważ delegowanie lub priorytetyzację.`,
      severity: "warning",
    });
  }

  const overdue = openTasks.filter(
    (t) => t.dueAt && new Date(t.dueAt).getTime() < Date.now(),
  );
  if (overdue.length) {
    insights.push({
      id: "overdue-tasks",
      title: "Przeterminowane zadania",
      body: `${overdue.length} zadań po terminie: ${overdue.map((t) => t.title).slice(0, 3).join(", ")}.`,
      severity: "critical",
    });
  }

  if (stats.newContacts >= 3) {
    insights.push({
      id: "new-contacts",
      title: "Nowe kontakty do obsługi",
      body: `${stats.newContacts} kontaktów w statusie „nowy”. Zaplanuj pierwsze rozmowy.`,
      severity: "info",
    });
  }

  if (stats.activeSponsors === 0) {
    insights.push({
      id: "no-active-sponsors",
      title: "Brak aktywnych sponsorów w pipeline",
      body: "Żaden kontakt nie ma statusu „aktywny sponsor”. Sprawdź negocjacje i oferty w toku.",
      severity: "warning",
    });
  }

  return insights;
}
