import { cache } from "react";

import { getClubBrandingName } from "@/lib/club/names";
import {
  mapVideo,
  mapVideoClip,
  mapVideoEvent,
  mapVideoJob,
  mapVideoNewsDraft,
  mapVideoNote,
  mapVideoReport,
} from "@/lib/video/mappers";
import { isStoragePathForVideo } from "@/lib/video/uploads";
import { createClient } from "@/lib/supabase/server";
import type {
  Video,
  VideoClip,
  VideoDashboardStats,
  VideoEvent,
  VideoJob,
  VideoNewsDraft,
  VideoNote,
  VideoReport,
} from "@/types/video";

export const getVideos = cache(async (clubId: string, category?: string): Promise<Video[]> => {
  const supabase = await createClient();
  let query = supabase
    .from("videos")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (category) {
    query = query.eq("category", category);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapVideo(row as Record<string, unknown>));
});

export const getVideoById = cache(async (clubId: string, videoId: string): Promise<Video | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("club_id", clubId)
    .eq("id", videoId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapVideo(data as Record<string, unknown>) : null;
});

export const getVideoDashboardStats = cache(async (clubId: string): Promise<VideoDashboardStats> => {
  const supabase = await createClient();
  const [videosRes, jobsRes, reportsRes, draftsRes] = await Promise.all([
    supabase.from("videos").select("id, title, view_count, created_at").eq("club_id", clubId),
    supabase
      .from("video_jobs")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .in("status", ["pending", "processing"]),
    supabase
      .from("video_reports")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId),
    supabase
      .from("video_news_drafts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "pending_approval"),
  ]);

  const videos = videosRes.data ?? [];
  const sorted = [...videos].sort((a, b) => Number(b.view_count ?? 0) - Number(a.view_count ?? 0));

  return {
    recentCount: videos.length,
    pendingJobs: jobsRes.count ?? 0,
    readyReports: reportsRes.count ?? 0,
    pendingNewsDrafts: draftsRes.count ?? 0,
    topViewed: sorted.slice(0, 5).map((v) => ({
      id: String(v.id),
      title: String(v.title),
      viewCount: Number(v.view_count ?? 0),
    })),
  };
});

export async function getVideoDetailBundle(clubId: string, videoId: string) {
  const supabase = await createClient();
  const [video, jobs, reports, events, notes, clips, drafts] = await Promise.all([
    getVideoById(clubId, videoId),
    supabase
      .from("video_jobs")
      .select("*")
      .eq("club_id", clubId)
      .eq("video_id", videoId)
      .order("created_at", { ascending: false }),
    supabase.from("video_reports").select("*").eq("club_id", clubId).eq("video_id", videoId),
    supabase
      .from("video_events")
      .select("*")
      .eq("club_id", clubId)
      .eq("video_id", videoId)
      .order("timestamp_seconds"),
    supabase
      .from("video_notes")
      .select("*")
      .eq("club_id", clubId)
      .eq("video_id", videoId)
      .order("timestamp_seconds"),
    supabase.from("video_clips").select("*").eq("club_id", clubId).eq("video_id", videoId),
    supabase
      .from("video_news_drafts")
      .select("*")
      .eq("club_id", clubId)
      .eq("video_id", videoId)
      .order("created_at", { ascending: false }),
  ]);

  return {
    video,
    jobs: (jobs.data ?? []).map((row) => mapVideoJob(row as Record<string, unknown>)) as VideoJob[],
    reports: (reports.data ?? []).map((row) => mapVideoReport(row as Record<string, unknown>)) as VideoReport[],
    events: (events.data ?? []).map((row) => mapVideoEvent(row as Record<string, unknown>)) as VideoEvent[],
    notes: (notes.data ?? []).map((row) => mapVideoNote(row as Record<string, unknown>)) as VideoNote[],
    clips: (clips.data ?? []).map((row) => mapVideoClip(row as Record<string, unknown>)) as VideoClip[],
    drafts: (drafts.data ?? []).map((row) =>
      mapVideoNewsDraft(row as Record<string, unknown>),
    ) as VideoNewsDraft[],
  };
}

export async function getVideoSignedUrl(
  clubId: string,
  videoId: string,
  storagePath: string | null,
): Promise<string | null> {
  if (!storagePath || !isStoragePathForVideo(storagePath, clubId, videoId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("club-videos").createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data.signedUrl;
}

export async function incrementVideoView(clubId: string, videoId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("videos").select("view_count").eq("id", videoId).eq("club_id", clubId).single();
  if (!data) return;
  await supabase
    .from("videos")
    .update({ view_count: Number(data.view_count ?? 0) + 1 })
    .eq("id", videoId)
    .eq("club_id", clubId);
}

export async function getClubNameForVideo(clubId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("clubs").select("public_name").eq("id", clubId).single();
  return data?.public_name ? getClubBrandingName({ publicName: data.public_name }) : "Klub";
}
