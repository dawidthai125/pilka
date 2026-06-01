"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { randomUUID } from "node:crypto";

import {
  canManageVideos,
  canPublishVideoNews,
  canShareVideos,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { getClubNameForVideo } from "@/lib/video/loaders";
import {
  generateNewsDraftsFromReport,
  generateVideoAnalysisReport,
} from "@/lib/video/processing";
import {
  VIDEO_STORAGE_BUCKET,
  buildVideoStoragePath,
  validateVideoUpload,
} from "@/lib/video/uploads";
import { parseVideoTimestamp } from "@/lib/video/mappers";
import { createClient } from "@/lib/supabase/server";
import {
  VIDEO_CATEGORIES,
  VIDEO_CLIP_CATEGORIES,
  VIDEO_EVENT_TYPES,
  type VideoCategory,
  type VideoClipCategory,
  type VideoEventType,
} from "@/types/video";

export type VideoActionState = {
  error?: string;
  success?: string;
  videoId?: string;
  storagePath?: string;
};

function parseVideoCategory(raw: string): VideoCategory | null {
  return VIDEO_CATEGORIES.includes(raw as VideoCategory) ? (raw as VideoCategory) : null;
}

function parseVideoEventType(raw: string): VideoEventType | null {
  return VIDEO_EVENT_TYPES.includes(raw as VideoEventType) ? (raw as VideoEventType) : null;
}

function parseVideoClipCategory(raw: string): VideoClipCategory | null {
  return VIDEO_CLIP_CATEGORIES.includes(raw as VideoClipCategory) ? (raw as VideoClipCategory) : null;
}

async function verifyVideoInClub(clubId: string, videoId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id")
    .eq("club_id", clubId)
    .eq("id", videoId)
    .maybeSingle();
  if (error || !data) throw new Error("Nagranie nie istnieje.");
}

async function runVideoProcessingPipeline(
  clubId: string,
  videoId: string,
  userId: string,
  jobId: string,
) {
  const supabase = await createClient();

  await supabase
    .from("video_jobs")
    .update({ status: "processing", step: "storage_verified", progress_percent: 20, started_at: new Date().toISOString() })
    .eq("id", jobId);

  await supabase.from("videos").update({ job_status: "processing" }).eq("id", videoId);

  const { data: videoRow } = await supabase.from("videos").select("*").eq("id", videoId).single();
  if (!videoRow) throw new Error("Brak nagrania.");

  await supabase
    .from("video_jobs")
    .update({ step: "ai_analysis", progress_percent: 55 })
    .eq("id", jobId);

  const clubName = await getClubNameForVideo(clubId);
  const report = await generateVideoAnalysisReport(
    {
      title: String(videoRow.title),
      category: videoRow.category as VideoCategory,
      description: (videoRow.description as string | null) ?? null,
      opponentName: (videoRow.opponent_name as string | null) ?? null,
    },
    clubName,
  );

  const { data: insertedReport } = await supabase
    .from("video_reports")
    .insert({
      club_id: clubId,
      video_id: videoId,
      report_type: report.reportType,
      title: report.title,
      summary: report.summary,
      strengths: report.strengths,
      weaknesses: report.weaknesses,
      key_moments: report.keyMoments,
      coaching_recommendations: report.coachingRecommendations,
      extra_sections: report.extraSections,
      generated_by_ai: true,
      created_by: userId,
    })
    .select("id")
    .single();

  if (report.suggestedEvents.length > 0) {
    const validEvents = report.suggestedEvents.filter((event) =>
      VIDEO_EVENT_TYPES.includes(event.eventType as VideoEventType),
    );
    if (validEvents.length > 0) {
      await supabase.from("video_events").insert(
        validEvents.map((event) => ({
          club_id: clubId,
          video_id: videoId,
          event_type: event.eventType as VideoEventType,
          source: "ai_suggested",
          timestamp_seconds: event.timestampSeconds,
          label: event.label,
          description: event.description,
        })),
      );
    }
  }

  const drafts = generateNewsDraftsFromReport(String(videoRow.title), report);
  if (insertedReport && videoRow.category === "match") {
    await supabase.from("video_news_drafts").insert(
      drafts.map((draft) => ({
        club_id: clubId,
        video_id: videoId,
        report_id: insertedReport.id,
        draft_type: draft.draftType,
        title: draft.title,
        content: draft.content,
        status: "pending_approval",
      })),
    );
  }

  await supabase
    .from("video_jobs")
    .update({
      status: "ready",
      step: "completed",
      progress_percent: 100,
      completed_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  await supabase.from("videos").update({ job_status: "ready", job_error: null }).eq("id", videoId);
}

async function verifyShareRecipient(clubId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_memberships")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) throw new Error("Odbiorca nie jest aktywnym członkiem klubu.");
}

async function scheduleVideoProcessing(
  clubId: string,
  videoId: string,
  userId: string,
  jobId: string,
) {
  after(async () => {
    const supabase = await createClient();
    try {
      await runVideoProcessingPipeline(clubId, videoId, userId, jobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Błąd przetwarzania.";
      await supabase.from("videos").update({ job_status: "error", job_error: message }).eq("id", videoId);
      await supabase
        .from("video_jobs")
        .update({ status: "error", error_message: message, step: "failed" })
        .eq("id", jobId);
    }
  });
}

function readUploadMetadata(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const categoryRaw = String(formData.get("category") ?? "match");
  const category = parseVideoCategory(categoryRaw);
  const opponentName = String(formData.get("opponentName") ?? "").trim() || null;
  const matchId = String(formData.get("matchId") ?? "").trim() || null;
  const trainingId = String(formData.get("trainingId") ?? "").trim() || null;
  const fileName = String(formData.get("fileName") ?? "").trim();
  const mimeType = String(formData.get("mimeType") ?? "video/mp4").trim() || "video/mp4";
  const fileSize = Number(formData.get("fileSize") ?? 0);

  return { title, description, category, opponentName, matchId, trainingId, fileName, mimeType, fileSize };
}

export async function initVideoUploadAction(
  _prev: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) {
    return { error: "Brak uprawnień do dodawania nagrań." };
  }

  const { title, description, category, opponentName, matchId, trainingId, fileName, mimeType, fileSize } =
    readUploadMetadata(formData);

  if (!title) return { error: "Podaj tytuł nagrania." };
  if (!category) return { error: "Nieprawidłowa kategoria nagrania." };
  if (!fileName || fileSize <= 0) return { error: "Wybierz plik wideo." };

  const validationError = validateVideoUpload({ type: mimeType, size: fileSize, name: fileName });
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const videoId = randomUUID();
  const storagePath = buildVideoStoragePath(access.clubId, videoId, fileName);

  const { error: insertError } = await supabase.from("videos").insert({
    id: videoId,
    club_id: access.clubId,
    uploaded_by: access.userId,
    title,
    description,
    category,
    opponent_name: opponentName,
    match_id: matchId,
    training_id: trainingId,
    file_name: fileName,
    mime_type: mimeType,
    file_size_bytes: fileSize,
    job_status: "pending",
    recorded_at: new Date().toISOString(),
  });

  if (insertError) return { error: insertError.message };

  return { videoId, storagePath };
}

export async function completeVideoUploadAction(
  videoId: string,
  clientStoragePath?: string,
): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) {
    return { error: "Brak uprawnień do dodawania nagrań." };
  }

  if (!videoId) return { error: "Brak identyfikatora nagrania." };

  await verifyVideoInClub(access.clubId, videoId);
  const supabase = await createClient();

  const { data: videoRow } = await supabase
    .from("videos")
    .select("file_name, mime_type, storage_path")
    .eq("id", videoId)
    .eq("club_id", access.clubId)
    .single();

  if (!videoRow?.file_name) return { error: "Nagranie nie istnieje." };

  const existingPath =
    typeof videoRow.storage_path === "string" && videoRow.storage_path.length > 0
      ? videoRow.storage_path
      : null;

  const storagePathResolved =
    clientStoragePath ??
    existingPath ??
    buildVideoStoragePath(access.clubId, videoId, String(videoRow.file_name));

  if (!storagePathResolved.startsWith(`${access.clubId}/videos/${videoId}/`)) {
    return { error: "Nieprawidłowa ścieżka storage." };
  }

  const folderPath = `${access.clubId}/videos/${videoId}`;
  const fileName = storagePathResolved.split("/").pop();
  const { data: storedFile, error: listError } = await supabase.storage
    .from(VIDEO_STORAGE_BUCKET)
    .list(folderPath, { limit: 100 });

  const uploaded = storedFile?.some((entry) => entry.name === fileName);
  if (listError || !uploaded) {
    return { error: "Plik nie został przesłany do storage. Spróbuj ponownie." };
  }

  const { error: updateError } = await supabase
    .from("videos")
    .update({ storage_path: storagePathResolved })
    .eq("id", videoId);

  if (updateError) return { error: updateError.message };

  const { data: job } = await supabase
    .from("video_jobs")
    .insert({
      club_id: access.clubId,
      video_id: videoId,
      status: "pending",
      step: "queued",
    })
    .select("id")
    .single();

  if (!job) return { error: "Nie udało się utworzyć zadania przetwarzania." };

  await scheduleVideoProcessing(access.clubId, videoId, access.userId, String(job.id));

  revalidatePath("/video");
  revalidatePath("/video/library");
  revalidatePath(`/video/${videoId}`);
  return { success: "Nagranie dodane. Analiza AI w toku.", videoId };
}

export async function abortVideoUploadAction(videoId: string): Promise<void> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) return;

  const supabase = await createClient();
  await supabase.from("videos").delete().eq("id", videoId).eq("club_id", access.clubId);
}

export async function reprocessVideoAction(videoId: string): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) return { error: "Brak uprawnień." };

  await verifyVideoInClub(access.clubId, videoId);
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("video_jobs")
    .insert({ club_id: access.clubId, video_id: videoId, status: "pending", step: "queued" })
    .select("id")
    .single();

  if (!job) return { error: "Nie udało się utworzyć zadania." };

  await scheduleVideoProcessing(access.clubId, videoId, access.userId, String(job.id));

  revalidatePath(`/video/${videoId}`);
  return { success: "Ponowna analiza AI w toku." };
}

export async function addVideoEventAction(
  _prev: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) return { error: "Brak uprawnień." };

  const videoId = String(formData.get("videoId") ?? "");
  const eventTypeRaw = String(formData.get("eventType") ?? "goal");
  const eventType = parseVideoEventType(eventTypeRaw);
  const timestampRaw = String(formData.get("timestamp") ?? "");
  const timestampSeconds = parseVideoTimestamp(timestampRaw);
  const label = String(formData.get("label") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!videoId || timestampSeconds == null || !eventType) {
    return { error: "Podaj poprawny czas (mm:ss) i typ zdarzenia." };
  }

  await verifyVideoInClub(access.clubId, videoId);
  const supabase = await createClient();
  const { error } = await supabase.from("video_events").insert({
    club_id: access.clubId,
    video_id: videoId,
    event_type: eventType,
    source: "manual",
    timestamp_seconds: timestampSeconds,
    label,
    description,
    created_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidatePath(`/video/${videoId}`);
  return { success: "Zdarzenie dodane." };
}

export async function confirmAiEventAction(eventId: string, videoId: string): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("video_events")
    .update({ source: "ai_confirmed", created_by: access.userId })
    .eq("id", eventId)
    .eq("club_id", access.clubId)
    .eq("video_id", videoId);

  if (error) return { error: error.message };
  revalidatePath(`/video/${videoId}`);
  return { success: "Sugestia AI potwierdzona." };
}

export async function addVideoNoteAction(
  _prev: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) return { error: "Brak uprawnień." };

  const videoId = String(formData.get("videoId") ?? "");
  const timestampRaw = String(formData.get("timestamp") ?? "");
  const timestampSeconds = parseVideoTimestamp(timestampRaw);
  const content = String(formData.get("content") ?? "").trim();

  if (!videoId || timestampSeconds == null || !content) {
    return { error: "Podaj czas (mm:ss) i treść notatki." };
  }

  await verifyVideoInClub(access.clubId, videoId);
  const supabase = await createClient();
  const { error } = await supabase.from("video_notes").insert({
    club_id: access.clubId,
    video_id: videoId,
    author_id: access.userId,
    timestamp_seconds: timestampSeconds,
    content,
  });

  if (error) return { error: error.message };
  revalidatePath(`/video/${videoId}`);
  return { success: "Notatka dodana." };
}

export async function createVideoClipAction(
  _prev: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canManageVideos(access.roles)) return { error: "Brak uprawnień." };

  const videoId = String(formData.get("videoId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "custom");
  const category = parseVideoClipCategory(categoryRaw);
  const startRaw = parseVideoTimestamp(String(formData.get("startTime") ?? ""));
  const endRaw = parseVideoTimestamp(String(formData.get("endTime") ?? ""));

  if (!videoId || !title || !category || startRaw == null || endRaw == null || endRaw <= startRaw) {
    return { error: "Podaj tytuł i poprawny zakres czasu (mm:ss)." };
  }

  await verifyVideoInClub(access.clubId, videoId);
  const supabase = await createClient();
  const { error } = await supabase.from("video_clips").insert({
    club_id: access.clubId,
    video_id: videoId,
    title,
    category,
    start_seconds: startRaw,
    end_seconds: endRaw,
    created_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidatePath(`/video/${videoId}`);
  return { success: "Klip zapisany." };
}

export async function approveVideoNewsDraftAction(draftId: string): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canPublishVideoNews(access.roles)) return { error: "Brak uprawnień do publikacji." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("video_news_drafts")
    .update({
      status: "approved",
      approved_by: access.userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidatePath("/video");
  return { success: "Szkic zatwierdzony — gotowy do publikacji." };
}

export async function rejectVideoNewsDraftAction(draftId: string): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canPublishVideoNews(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("video_news_drafts")
    .update({ status: "rejected", approved_by: access.userId, approved_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidatePath("/video");
  return { success: "Szkic odrzucony." };
}

export async function shareVideoAction(
  _prev: VideoActionState,
  formData: FormData,
): Promise<VideoActionState> {
  const access = await requireAccessContext();
  if (!canShareVideos(access.roles)) return { error: "Brak uprawnień do udostępniania." };

  const videoId = String(formData.get("videoId") ?? "");
  const sharedWithUserId = String(formData.get("sharedWithUserId") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!videoId || !sharedWithUserId) return { error: "Podaj odbiorcę." };

  await verifyVideoInClub(access.clubId, videoId);
  try {
    await verifyShareRecipient(access.clubId, sharedWithUserId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Nieprawidłowy odbiorca." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("video_shares").upsert(
    {
      club_id: access.clubId,
      video_id: videoId,
      shared_with_user_id: sharedWithUserId,
      shared_by: access.userId,
      note,
    },
    { onConflict: "video_id,shared_with_user_id" },
  );

  if (error) return { error: error.message };
  revalidatePath(`/video/${videoId}`);
  return { success: "Materiał udostępniony." };
}
