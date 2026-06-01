import { callOpenAiChat, isOpenAiConfigured } from "@/integrations/openai";
import type { Video, VideoCategory, VideoReportType } from "@/types/video";

export type GeneratedVideoReport = {
  reportType: VideoReportType;
  title: string;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  keyMoments: Array<{ minute?: number; label: string; description: string }>;
  coachingRecommendations: string[];
  extraSections: Record<string, unknown>;
  suggestedEvents: Array<{
    eventType: string;
    timestampSeconds: number;
    label: string;
    description: string;
  }>;
};

function reportTypeForCategory(category: VideoCategory): VideoReportType {
  if (category === "training") return "training";
  if (category === "opponent_analysis") return "opponent";
  return "match";
}

function templateReport(video: Pick<Video, "title" | "category" | "description" | "opponentName">): GeneratedVideoReport {
  const reportType = reportTypeForCategory(video.category);

  if (reportType === "training") {
    return {
      reportType,
      title: `Raport AI — ${video.title}`,
      summary:
        video.description ??
        "Trening przebiegł w stabilnej organizacji. Zespół utrzymał wysoką intensywność w głównych blokach ćwiczeń.",
      strengths: [
        "Dobra organizacja ćwiczeń",
        "Wysoka intensywność w seriach",
        "Zaangażowanie większości zawodników",
      ],
      weaknesses: ["Do poprawy komunikacja przy wyjściu z pressingu", "Zbyt długie przerwy między partiami"],
      keyMoments: [
        { minute: 15, label: "Blok pressing", description: "Pressing 6v6 na połowie przeciwnika" },
        { minute: 45, label: "SSG", description: "Gra 8v8 z limitem dotknięć" },
      ],
      coachingRecommendations: [
        "Skrócić przerwy regeneracyjne do 90 s",
        "Dodać rotację w ćwiczeniach pressingowych",
      ],
      extraSections: { intensity: "wysoka", organization: "dobra", engagement: "dobre" },
      suggestedEvents: [
        { eventType: "substitution", timestampSeconds: 1800, label: "Rotacja", description: "Zmiana składów w SSG" },
      ],
    };
  }

  if (reportType === "opponent") {
    return {
      reportType,
      title: `Raport AI — analiza ${video.opponentName ?? "przeciwnika"}`,
      summary:
        video.description ??
        "Przeciwnik preferuje grę skrzydłami. Słabszy przy intensywnym pressingu na obrońców.",
      strengths: ["Szybkie skrzydła", "Skuteczne stałe fragmenty ofensywne"],
      weaknesses: ["Problemy z wyjściem piłki pod pressingiem", "Słabsza gra głową w defensywie"],
      keyMoments: [
        { minute: 34, label: "Kluczowy zawodnik", description: "Playmaker — główny kreator akcji" },
        { minute: 72, label: "Słabość", description: "Błąd przy wypuścieniu piłki przez bramkarza" },
      ],
      coachingRecommendations: [
        "Pressing na obrońców w ich połowie",
        "Blokada aktywnych skrzydeł wysuniętym bocznym pomocnikiem",
      ],
      extraSections: { opponent: video.opponentName ?? "Nieznany" },
      suggestedEvents: [],
    };
  }

  return {
    reportType: "match",
    title: `Raport AI — ${video.title}`,
    summary:
      video.description ??
      "Mecz wykazuje przewagę w drugiej połowie dzięki lepszemu pressingowi i organizacji gry.",
    strengths: [
      "Skuteczny pressing po stracie",
      "Dobra organizacja stałych fragmentów",
      "Wysoka intensywność biegu bez piłki",
    ],
    weaknesses: ["Słabsza gra głową przy rzutach rożnych", "Linia obrony zbyt głęboka w 1. połowie"],
    keyMoments: [
      { minute: 23, label: "Gol", description: "Strzał z ok. 16 m po akcji skrzydłowej" },
      { minute: 67, label: "Gol", description: "Kontra po odbiorze na środku pola" },
    ],
    coachingRecommendations: [
      "Praca nad ustawieniem linii przy długich piłkach",
      "Trening gry głową 2× w tygodniu",
    ],
    extraSections: { intensity: "wysoka" },
    suggestedEvents: [
      { eventType: "goal", timestampSeconds: 1380, label: "Gol", description: "Strzał z dystansu — sugestia AI" },
      { eventType: "corner", timestampSeconds: 2100, label: "Rzut rożny", description: "Niebezpieczny rożny — sugestia AI" },
    ],
  };
}

async function aiEnhancedReport(
  video: Pick<Video, "title" | "category" | "description" | "opponentName">,
  clubName: string,
): Promise<GeneratedVideoReport | null> {
  if (!isOpenAiConfigured()) return null;

  const reportType = reportTypeForCategory(video.category);
  const prompt = `Wygeneruj raport wideo w JSON (tylko JSON, bez markdown) dla klubu ${clubName}.
Tytuł nagrania: ${video.title}
Kategoria: ${video.category}
Opis: ${video.description ?? "brak"}
Typ raportu: ${reportType}

Schema:
{
  "summary": string,
  "strengths": string[],
  "weaknesses": string[],
  "keyMoments": [{"minute": number, "label": string, "description": string}],
  "coachingRecommendations": string[],
  "extraSections": object
}`;

  try {
    const raw = await callOpenAiChat([
      { role: "system", content: "Jesteś analitykiem sportowym. Odpowiadasz wyłącznie poprawnym JSON." },
      { role: "user", content: prompt },
    ]);
    const parsed = JSON.parse(raw) as Partial<GeneratedVideoReport>;
    const base = templateReport(video);
    return {
      ...base,
      summary: parsed.summary ?? base.summary,
      strengths: parsed.strengths ?? base.strengths,
      weaknesses: parsed.weaknesses ?? base.weaknesses,
      keyMoments: parsed.keyMoments ?? base.keyMoments,
      coachingRecommendations: parsed.coachingRecommendations ?? base.coachingRecommendations,
      extraSections: parsed.extraSections ?? base.extraSections,
      suggestedEvents: base.suggestedEvents,
    };
  } catch {
    return null;
  }
}

export async function generateVideoAnalysisReport(
  video: Pick<Video, "title" | "category" | "description" | "opponentName">,
  clubName: string,
): Promise<GeneratedVideoReport> {
  const enhanced = await aiEnhancedReport(video, clubName);
  return enhanced ?? templateReport(video);
}

export function generateNewsDraftsFromReport(
  videoTitle: string,
  report: Pick<GeneratedVideoReport, "summary" | "title">,
): Array<{ draftType: "club_news" | "facebook_post" | "match_summary"; title: string; content: string }> {
  return [
    {
      draftType: "club_news",
      title: `Relacja wideo — ${videoTitle}`,
      content: `${report.summary}\n\nPełny raport AI dostępny w Video Center klubu.`,
    },
    {
      draftType: "facebook_post",
      title: `Post Facebook — ${videoTitle}`,
      content: `⚡ ${videoTitle}\n\n${report.summary.slice(0, 200)}…\n\n#FootballClubOS`,
    },
    {
      draftType: "match_summary",
      title: `Podsumowanie — ${videoTitle}`,
      content: report.summary,
    },
  ];
}
