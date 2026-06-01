import type { EquipmentAiInsight } from "@/types/equipment";

export type EquipmentDraftKind =
  | "maintenance_plan"
  | "purchase_list"
  | "return_reminder"
  | "inventory_report";

export function generateEquipmentDraft(
  kind: EquipmentDraftKind,
  insights: EquipmentAiInsight[],
): { title: string; body: string; model: string; aiUsed: boolean } {
  const titles: Record<EquipmentDraftKind, string> = {
    maintenance_plan: "Plan konserwacji sprzętu",
    purchase_list: "Lista zakupów wyposażenia",
    return_reminder: "Przypomnienie o zwrocie sprzętu",
    inventory_report: "Raport stanu majątku",
  };

  const intro = titles[kind];
  const bulletPoints = insights.length
    ? insights.map((i) => `• [${i.severity.toUpperCase()}] ${i.title}: ${i.body}`).join("\n")
    : "• Brak krytycznych alertów — utrzymuj regularne przeglądy magazynu.";

  const body = `${intro}\n\nRekomendacje AI (tylko do wglądu — bez automatycznych działań):\n\n${bulletPoints}\n\n---\nPrzygotuj plan działania z zarządem klubu.`;

  return {
    title: intro,
    body,
    model: "rule-based-v1",
    aiUsed: false,
  };
}
