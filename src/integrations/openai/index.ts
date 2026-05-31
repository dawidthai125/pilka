import { buildAiSystemPrompt, OPENAI_DEFAULT_MODEL } from "@/lib/ai/constants";

export function getOpenAiApiKey(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}

export function isOpenAiConfigured(): boolean {
  return !!getOpenAiApiKey();
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function callOpenAiChat(
  messages: ChatMessage[],
  options?: { model?: string; temperature?: number },
): Promise<string> {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("Brak klucza OPENAI_API_KEY w zmiennych środowiskowych.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options?.model ?? process.env.OPENAI_MODEL ?? OPENAI_DEFAULT_MODEL,
      temperature: options?.temperature ?? 0.3,
      messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error (${response.status}). Sprawdź konfigurację klucza API.`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("OpenAI zwróciło pustą odpowiedź.");
  return content;
}

export async function generateAiAnswer(
  userQuestion: string,
  clubName: string,
  clubContextJson: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `${buildAiSystemPrompt(clubName)}\n\nKontekst danych klubu (JSON):\n${clubContextJson}`,
    },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: userQuestion },
  ];

  return callOpenAiChat(messages);
}

export async function generateAiReportContent(
  instruction: string,
  clubName: string,
  clubContextJson: string,
): Promise<string> {
  return callOpenAiChat([
    {
      role: "system",
      content: `${buildAiSystemPrompt(clubName)}\n\nKontekst danych klubu (JSON):\n${clubContextJson}`,
    },
    { role: "user", content: instruction },
  ]);
}
