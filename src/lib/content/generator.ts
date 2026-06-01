import { callOpenAiChat, isOpenAiConfigured } from "@/integrations/openai";
import type { ContentChannel, ContentType } from "@/types/content";

export type GeneratedChannelContent = {
  website: { title: string; body: string };
  facebook: { title: string; body: string };
  instagram: { title: string; body: string };
};

export type ContentGenerationContext = {
  contentType: ContentType;
  title: string;
  summary?: string | null;
  matchInfo?: string | null;
  videoSummary?: string | null;
  sponsorName?: string | null;
  clubName: string;
};

function templateChannels(ctx: ContentGenerationContext): GeneratedChannelContent {
  const base = ctx.summary ?? ctx.title;
  return {
    website: {
      title: ctx.title,
      body: `${ctx.clubName}: ${base}. Pełna relacja i szczegóły na stronie klubu.`,
    },
    facebook: {
      title: ctx.title,
      body: `⚽ ${ctx.title}\n\n${base}\n\n#${ctx.clubName.replace(/\s+/g, "")}`,
    },
    instagram: {
      title: ctx.title.slice(0, 60),
      body: `⚽ ${base.slice(0, 180)} #${ctx.clubName.replace(/\s+/g, "")}`,
    },
  };
}

export async function generateContentChannels(
  ctx: ContentGenerationContext,
): Promise<{ channels: GeneratedChannelContent; model: string; aiUsed: boolean }> {
  if (!isOpenAiConfigured()) {
    return { channels: templateChannels(ctx), model: "template", aiUsed: false };
  }

  const prompt = [
    `Klub: ${ctx.clubName}`,
    `Typ treści: ${ctx.contentType}`,
    `Tytuł: ${ctx.title}`,
    ctx.summary ? `Kontekst: ${ctx.summary}` : null,
    ctx.matchInfo ? `Mecz: ${ctx.matchInfo}` : null,
    ctx.videoSummary ? `Wideo/raport: ${ctx.videoSummary}` : null,
    ctx.sponsorName ? `Sponsor: ${ctx.sponsorName}` : null,
    "Przygotuj 3 wersje: website (pełna), facebook (średnia, emoji ok), instagram (max 220 znaków).",
    'Odpowiedz JSON: {"website":{"title":"","body":""},"facebook":{"title":"","body":""},"instagram":{"title":"","body":""}}',
  ]
    .filter(Boolean)
    .join("\n");

  const response = await callOpenAiChat(
    [
      { role: "system", content: "Jesteś redaktorem klubu piłkarskiego. Pisz po polsku." },
      { role: "user", content: prompt },
    ],
    { temperature: 0.7 },
  );

  try {
    const parsed = JSON.parse(response) as GeneratedChannelContent;
    if (parsed.website?.body && parsed.facebook?.body && parsed.instagram?.body) {
      return { channels: parsed, model: "gpt-4o-mini", aiUsed: true };
    }
  } catch {
    // fallback
  }

  return { channels: templateChannels(ctx), model: "template-fallback", aiUsed: false };
}

export function inferContentTypeFromPrompt(prompt: string): ContentType {
  const lower = prompt.toLowerCase();
  if (lower.includes("zapowied")) return "match_preview";
  if (lower.includes("relacj") || lower.includes("mecz")) return "match_report";
  if (lower.includes("kolejk")) return "round_summary";
  if (lower.includes("sponsor")) return "sponsor_post";
  if (lower.includes("komunikat") || lower.includes("organizacyj")) return "club_announcement";
  if (lower.includes("galeri")) return "photo_gallery";
  if (lower.includes("raport ai") || lower.includes("ai")) return "ai_report";
  if (lower.includes("jubileusz")) return "anniversary_post";
  return "news";
}

export const DEFAULT_CHANNELS: ContentChannel[] = ["website", "facebook", "instagram"];
