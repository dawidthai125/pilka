import { callOpenAiChat, isOpenAiConfigured } from "@/integrations/openai";
import type { CrmAiDraftKind, CrmAiDraftResult } from "@/types/crm";

export type CrmDraftInput = {
  kind: CrmAiDraftKind;
  clubName: string;
  contactName?: string;
  prompt: string;
};

function templateDraft(input: CrmDraftInput): CrmAiDraftResult {
  const titles: Record<CrmAiDraftKind, string> = {
    sponsor_offer: "Oferta sponsorska",
    thank_you: "Podziękowanie",
    parent_email: "Wiadomość do rodzica",
    meeting_plan: "Plan rozmowy",
  };

  const body =
    input.kind === "sponsor_offer"
      ? `${input.clubName} proponuje współpracę sponsorską dla ${input.contactName ?? "partnera"}. ${input.prompt}`
      : input.kind === "thank_you"
        ? `Serdecznie dziękujemy ${input.contactName ?? ""} za wsparcie klubu ${input.clubName}. ${input.prompt}`
        : input.kind === "parent_email"
          ? `Dzień dobry, w imieniu ${input.clubName}: ${input.prompt}`
          : `Plan rozmowy z ${input.contactName ?? "kontaktem"}: ${input.prompt}`;

  return { title: titles[input.kind], body: body.trim(), model: "template", aiUsed: false };
}

export async function generateCrmDraft(input: CrmDraftInput): Promise<CrmAiDraftResult> {
  if (!isOpenAiConfigured()) return templateDraft(input);

  const systemByKind: Record<CrmAiDraftKind, string> = {
    sponsor_offer:
      "Napisz profesjonalną ofertę sponsorską klubu piłkarskiego po polsku. JSON: { title, body }.",
    thank_you: "Napisz podziękowanie dla sponsora/darczyńcy po polsku. JSON: { title, body }.",
    parent_email: "Napisz uprzejmą wiadomość do rodzica zawodnika po polsku. JSON: { title, body }.",
    meeting_plan: "Przygotuj plan rozmowy CRM (punkty). JSON: { title, body }.",
  };

  try {
    const raw = await callOpenAiChat([
      { role: "system", content: systemByKind[input.kind] },
      {
        role: "user",
        content: [
          `Klub: ${input.clubName}`,
          input.contactName ? `Kontakt: ${input.contactName}` : null,
          `Polecenie: ${input.prompt}`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    ]);
    const parsed = JSON.parse(raw) as { title?: string; body?: string };
    if (!parsed.body) return templateDraft(input);
    return {
      title: parsed.title?.trim() || templateDraft(input).title,
      body: parsed.body.trim(),
      model: "openai",
      aiUsed: true,
    };
  } catch {
    return templateDraft(input);
  }
}
