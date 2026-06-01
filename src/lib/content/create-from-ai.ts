import { randomUUID } from "node:crypto";

import { generateContentChannels, inferContentTypeFromPrompt } from "@/lib/content/generator";
import { getClubNameForContent } from "@/lib/content/loaders";
import { slugifyContentTitle } from "@/lib/content/mappers";
import { createClient } from "@/lib/supabase/server";
import type { ContentStatus } from "@/types/content";

export async function createContentPostFromAi(params: {
  clubId: string;
  userId: string;
  prompt: string;
  matchId?: string | null;
  videoId?: string | null;
  sponsorId?: string | null;
  canPublish: boolean;
  source?: "generator" | "agent" | "match" | "video";
}) {
  const supabase = await createClient();
  const contentType = inferContentTypeFromPrompt(params.prompt);
  const clubName = await getClubNameForContent(params.clubId);

  let matchInfo: string | null = null;
  let matchId: string | null = null;
  if (params.matchId) {
    const { data } = await supabase
      .from("matches")
      .select("home_team_name, away_team_name, home_score, away_score")
      .eq("id", params.matchId)
      .eq("club_id", params.clubId)
      .maybeSingle();
    if (!data) throw new Error("Mecz nie należy do tego klubu.");
    matchId = params.matchId;
    matchInfo = `${data.home_team_name} vs ${data.away_team_name}, wynik ${data.home_score ?? "?"}:${data.away_score ?? "?"}`;
  }

  let videoSummary: string | null = null;
  let videoId: string | null = null;
  if (params.videoId) {
    const { data: video } = await supabase
      .from("videos")
      .select("id")
      .eq("id", params.videoId)
      .eq("club_id", params.clubId)
      .maybeSingle();
    if (!video) throw new Error("Nagranie nie należy do tego klubu.");
    videoId = params.videoId;

    const { data: report } = await supabase
      .from("video_reports")
      .select("summary, title")
      .eq("video_id", params.videoId)
      .eq("club_id", params.clubId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (report) videoSummary = String(report.summary ?? report.title);
  }

  let sponsorId: string | null = null;
  if (params.sponsorId) {
    const { data: sponsor } = await supabase
      .from("sponsors")
      .select("id")
      .eq("id", params.sponsorId)
      .eq("club_id", params.clubId)
      .maybeSingle();
    if (!sponsor) throw new Error("Sponsor nie należy do tego klubu.");
    sponsorId = params.sponsorId;
  }

  const title = params.prompt.length > 80 ? `${params.prompt.slice(0, 77)}…` : params.prompt;
  const generated = await generateContentChannels({
    contentType,
    title,
    summary: params.prompt,
    matchInfo,
    videoSummary,
    clubName,
  });

  const postId = randomUUID();
  const status: ContentStatus = params.canPublish ? "draft" : "pending_approval";

  const { error } = await supabase.from("content_posts").insert({
    id: postId,
    club_id: params.clubId,
    content_type: contentType,
    status,
    title: generated.channels.website.title || title,
    slug: slugifyContentTitle(title),
    summary: params.prompt,
    body_website: generated.channels.website.body,
    match_id: matchId,
    video_id: videoId,
    sponsor_id: sponsorId,
    created_by: params.userId,
    ai_generated: true,
  });

  if (error) throw new Error(error.message);

  const channelRows = [
    { channel: "website" as const, data: generated.channels.website },
    { channel: "facebook" as const, data: generated.channels.facebook },
    { channel: "instagram" as const, data: generated.channels.instagram },
  ];

  for (const row of channelRows) {
    await supabase.from("content_channel_variants").insert({
      post_id: postId,
      club_id: params.clubId,
      channel: row.channel,
      title: row.data.title,
      body: row.data.body,
      status: "draft",
    });
  }

  await supabase.from("content_ai_generations").insert({
    club_id: params.clubId,
    post_id: postId,
    generation_type: contentType,
    prompt_summary: params.prompt,
    model: generated.model,
    source: params.source ?? "generator",
    created_by: params.userId,
  });

  return { postId, title: generated.channels.website.title || title, contentType, model: generated.model };
}
