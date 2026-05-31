import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CLUB_ID } from "@/lib/auth/session";
import { generateAiReportContent, isOpenAiConfigured } from "@/integrations/openai";
import type { WebsiteNewsCategory } from "@/types/website";
import { getPublicMatches, getPublicLeagueTable, getPublicNews } from "@/lib/website/public-data";

export async function buildWebsiteAiNewsDraft(
  clubId: string,
  topic: "match_report" | "round_summary" | "club_announcement",
  clubName: string,
): Promise<{ title: string; excerpt: string; content: string; category: WebsiteNewsCategory } | null> {
  if (!isOpenAiConfigured()) return null;

  const [recentResults, league, news] = await Promise.all([
    getPublicMatches(clubId, "results", 3),
    getPublicLeagueTable(clubId),
    getPublicNews(clubId, { limit: 3 }),
  ]);

  const context = {
    topic,
    clubName,
    recentResults: recentResults.map((m) => ({
      date: m.matchDate,
      score: `${m.homeTeamName} ${m.homeScore}:${m.awayScore} ${m.awayTeamName}`,
    })),
    tableTop: league.entries.slice(0, 5).map((e, index) => ({
      team: e.teamName,
      points: e.points,
      position: index + 1,
    })),
    recentNews: news.map((n) => n.title),
  };

  const prompt =
    topic === "match_report"
      ? "Napisz szkic aktualności meczowej klubu piłkarskiego po ostatnim wyniku. Ton: oficjalny, entuzjastyczny. JSON: title, excerpt (max 160 znaków), content (3-5 akapitów), category (matches)."
      : topic === "round_summary"
        ? "Napisz podsumowanie kolejki ligowej dla kibiców klubu. JSON: title, excerpt, content, category (matches)."
        : "Napisz komunikat klubowy dla kibiców i społeczności lokalnej. JSON: title, excerpt, content, category (club).";

  try {
    const raw = await generateAiReportContent(
      prompt,
      clubName,
      JSON.stringify(context, null, 2),
    );
    const parsed = JSON.parse(raw) as {
      title?: string;
      excerpt?: string;
      content?: string;
      category?: WebsiteNewsCategory;
    };
    if (!parsed.title || !parsed.content) return null;
    return {
      title: parsed.title,
      excerpt: parsed.excerpt ?? parsed.content.slice(0, 160),
      content: parsed.content,
      category: parsed.category ?? (topic === "club_announcement" ? "club" : "matches"),
    };
  } catch {
    return null;
  }
}

export async function buildWebsiteAiContext(clubId: string = DEFAULT_CLUB_ID) {
  const supabase = await createClient();
  const [newsRes, albumsRes] = await Promise.all([
    supabase
      .from("website_news")
      .select("title, status, category")
      .eq("club_id", clubId)
      .order("updated_at", { ascending: false })
      .limit(20),
    supabase
      .from("website_gallery_albums")
      .select("title, is_published, category")
      .eq("club_id", clubId)
      .limit(10),
  ]);

  return {
    draftNews: (newsRes.data ?? []).filter((n) => n.status === "draft").length,
    publishedNews: (newsRes.data ?? []).filter((n) => n.status === "published").length,
    galleryAlbums: (albumsRes.data ?? []).filter((a) => a.is_published).length,
  };
}
