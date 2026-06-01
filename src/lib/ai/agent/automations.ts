import type { AiTask } from "@/types/ai-agent";

export type AutomationProposal = {
  id: string;
  title: string;
  description: string;
  command: string;
  automationType: string;
  suggestedTool: string;
};

export async function buildAutomationProposals(_clubId: string): Promise<AutomationProposal[]> {
  return [
    {
      id: "auto-expiring-docs",
      title: "Wygasające dokumenty",
      description: "Zawodnicy z badaniami wygasającymi w ciągu 30 dni.",
      command: "Pokaż zawodników z wygasającymi badaniami",
      automationType: "expiring_documents",
      suggestedTool: "getDocuments",
    },
    {
      id: "auto-low-attendance",
      title: "Niska frekwencja",
      description: "Zawodnicy z frekwencją poniżej 60% na treningach.",
      command: "Pokaż zawodników z frekwencją poniżej 60%",
      automationType: "low_attendance",
      suggestedTool: "getPlayers",
    },
    {
      id: "auto-sponsor-contact",
      title: "Sponsor bez kontaktu",
      description: "Sponsorzy bez kontaktu od ponad 30 dni.",
      command: "Znajdź sponsorów bez kontaktu od 30 dni",
      automationType: "sponsor_no_contact",
      suggestedTool: "getSponsors",
    },
    {
      id: "auto-overdue-fees",
      title: "Zaległe składki",
      description: "Zawodnicy z zaległymi opłatami klubowymi.",
      command: "Pokaż zaległe składki",
      automationType: "fee_overdue",
      suggestedTool: "getFinances",
    },
  ];
}

export function isAutomationTask(task: AiTask): boolean {
  return task.metadata?.kind === "automation_proposal";
}
