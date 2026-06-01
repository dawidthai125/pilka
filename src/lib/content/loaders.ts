import { cache } from "react";

import {
  mapContentAiGeneration,
  mapContentApproval,
  mapContentAsset,
  mapContentCalendarEntry,
  mapContentChannelConfig,
  mapContentChannelVariant,
  mapContentPost,
} from "@/lib/content/mappers";
import { createClient } from "@/lib/supabase/server";
import type {
  ContentAiGeneration,
  ContentApproval,
  ContentAsset,
  ContentCalendarEntry,
  ContentChannelConfig,
  ContentChannelVariant,
  ContentDashboardStats,
  ContentPost,
  ContentStatus,
  ContentType,
} from "@/types/content";

export const getContentPosts = cache(
  async (
    clubId: string,
    filters?: { status?: ContentStatus; contentType?: ContentType },
  ): Promise<ContentPost[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("content_posts")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.contentType) query = query.eq("content_type", filters.contentType);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapContentPost(row as Record<string, unknown>));
  },
);

export const getContentPostById = cache(async (clubId: string, postId: string): Promise<ContentPost | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_posts")
    .select("*")
    .eq("club_id", clubId)
    .eq("id", postId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapContentPost(data as Record<string, unknown>) : null;
});

export async function getContentPostBundle(clubId: string, postId: string) {
  const supabase = await createClient();
  const [post, variants, approvals, calendar, assets, aiLogs] = await Promise.all([
    getContentPostById(clubId, postId),
    supabase.from("content_channel_variants").select("*").eq("club_id", clubId).eq("post_id", postId),
    supabase
      .from("content_approvals")
      .select("*")
      .eq("club_id", clubId)
      .eq("post_id", postId)
      .order("created_at", { ascending: false }),
    supabase.from("content_calendar").select("*").eq("club_id", clubId).eq("post_id", postId),
    supabase.from("content_assets").select("*").eq("club_id", clubId).eq("post_id", postId),
    supabase
      .from("content_ai_generations")
      .select("*")
      .eq("club_id", clubId)
      .eq("post_id", postId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    post,
    variants: (variants.data ?? []).map((row) =>
      mapContentChannelVariant(row as Record<string, unknown>),
    ) as ContentChannelVariant[],
    approvals: (approvals.data ?? []).map((row) =>
      mapContentApproval(row as Record<string, unknown>),
    ) as ContentApproval[],
    calendar: (calendar.data ?? []).map((row) =>
      mapContentCalendarEntry(row as Record<string, unknown>),
    ) as ContentCalendarEntry[],
    assets: (assets.data ?? []).map((row) => mapContentAsset(row as Record<string, unknown>)) as ContentAsset[],
    aiLogs: (aiLogs.data ?? []).map((row) =>
      mapContentAiGeneration(row as Record<string, unknown>),
    ) as ContentAiGeneration[],
  };
}

export const getContentDashboardStats = cache(async (clubId: string): Promise<ContentDashboardStats> => {
  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [postsRes, pendingRes, scheduledRes, publishedRes, queuedRes] = await Promise.all([
    supabase.from("content_posts").select("id", { count: "exact", head: true }).eq("club_id", clubId),
    supabase
      .from("content_posts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending_approval"),
    supabase
      .from("content_calendar")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .gte("scheduled_at", new Date().toISOString()),
    supabase
      .from("content_posts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "published")
      .gte("published_at", monthStart.toISOString()),
    supabase
      .from("content_channel_variants")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "queued"),
  ]);

  return {
    totalPosts: postsRes.count ?? 0,
    pendingApproval: pendingRes.count ?? 0,
    scheduled: scheduledRes.count ?? 0,
    publishedThisMonth: publishedRes.count ?? 0,
    queuedSocial: queuedRes.count ?? 0,
  };
});

export const getContentChannels = cache(async (clubId: string): Promise<ContentChannelConfig[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("content_channels").select("*").eq("club_id", clubId).order("channel");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapContentChannelConfig(row as Record<string, unknown>));
});

export const getContentAssets = cache(async (clubId: string): Promise<ContentAsset[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_assets")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapContentAsset(row as Record<string, unknown>));
});

export async function getContentCalendarRange(
  clubId: string,
  from: string,
  to: string,
): Promise<Array<ContentCalendarEntry & { post: ContentPost | null }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("content_calendar")
    .select("*, content_posts(*)")
    .eq("club_id", clubId)
    .gte("scheduled_at", from)
    .lte("scheduled_at", to)
    .order("scheduled_at");

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const record = row as Record<string, unknown>;
    const postRaw = record.content_posts as Record<string, unknown> | null;
    return {
      ...mapContentCalendarEntry(record),
      post: postRaw ? mapContentPost(postRaw) : null,
    };
  });
}

export async function getClubNameForContent(clubId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("clubs").select("public_name").eq("id", clubId).single();
  return data?.public_name ? String(data.public_name) : "Klub";
}
