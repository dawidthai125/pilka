import { callOpenAiChat, isOpenAiConfigured } from "@/integrations/openai";

export type CommunicationDraftKind = "announcement" | "coach_message" | "reminder" | "style_fix";

export type CommunicationDraftInput = {
  kind: CommunicationDraftKind;
  clubName: string;
  teamName?: string;
  prompt: string;
  existingText?: string;
};

export type CommunicationDraftResult = {
  title: string;
  body: string;
  model: string;
  aiUsed: boolean;
};

function templateDraft(input: CommunicationDraftInput): CommunicationDraftResult {
  const title =
    input.kind === "coach_message"
      ? "Komunikat treningowy"
      : input.kind === "reminder"
        ? "Przypomnienie klubowe"
        : "Ogłoszenie klubowe";

  const body =
    input.kind === "style_fix" && input.existingText
      ? input.existingText.trim()
      : `${input.clubName}${input.teamName ? ` — ${input.teamName}` : ""}: ${input.prompt}`;

  return { title, body, model: "template", aiUsed: false };
}

export async function generateCommunicationDraft(
  input: CommunicationDraftInput,
): Promise<CommunicationDraftResult> {
  if (!isOpenAiConfigured()) return templateDraft(input);

  const system =
    input.kind === "style_fix"
      ? "Popraw styl wiadomości klubowej po polsku. Zachowaj treść merytoryczną. JSON: { title, body }."
      : input.kind === "coach_message"
        ? "Napisz krótki komunikat trenera do drużyny (trening/mecz). Ton: konkretny, uprzejmy. JSON: { title, body }."
        : input.kind === "reminder"
          ? "Napisz przypomnienie dla klubu piłkarskiego. JSON: { title, body }."
          : "Napisz ogłoszenie klubowe. JSON: { title, body }.";

  try {
    const raw = await callOpenAiChat([
      { role: "system", content: system },
      {
        role: "user",
        content: [
          `Klub: ${input.clubName}`,
          input.teamName ? `Drużyna: ${input.teamName}` : null,
          `Polecenie: ${input.prompt}`,
          input.existingText ? `Tekst do poprawy: ${input.existingText}` : null,
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
