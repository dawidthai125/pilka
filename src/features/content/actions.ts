"use server";

import { randomUUID } from "node:crypto";

import {
  canCreateContent,
  canManageContent,
  canPublishContent,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { DEFAULT_CHANNELS } from "@/lib/content/generator";
import { createContentPostFromAi } from "@/lib/content/create-from-ai";
import { getContentPostById } from "@/lib/content/loaders";
import { slugifyContentTitle } from "@/lib/content/mappers";
import { publishContentToWebsite, revalidateContentPaths } from "@/lib/content/publish";
import { verifyContentReferences } from "@/lib/content/verify-references";
import { createClient } from "@/lib/supabase/server";
import {
  CONTENT_CHANNELS,
  CONTENT_STATUSES,
  CONTENT_TYPES,
  type ContentChannel,
  type ContentStatus,
  type ContentType,
} from "@/types/content";

export type ContentActionState = {
  error?: string;
  success?: string;
  postId?: string;
};

function parseContentType(raw: string): ContentType | null {
  return CONTENT_TYPES.includes(raw as ContentType) ? (raw as ContentType) : null;
}

function parseContentStatus(raw: string): ContentStatus | null {
  return CONTENT_STATUSES.includes(raw as ContentStatus) ? (raw as ContentStatus) : null;
}

function parseContentChannel(raw: string): ContentChannel | null {
  return CONTENT_CHANNELS.includes(raw as ContentChannel) ? (raw as ContentChannel) : null;
}

async function logContentApproval(
  clubId: string,
  postId: string,
  action: "submitted" | "approved" | "rejected" | "published",
  actorId: string,
  note?: string | null,
) {
  const supabase = await createClient();
  await supabase.from("content_approvals").insert({
    club_id: clubId,
    post_id: postId,
    action,
    actor_id: actorId,
    note: note ?? null,
  });
}

export async function generateContentWithAiAction(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canCreateContent(access.roles)) return { error: "Brak uprawnień." };

  const prompt = String(formData.get("prompt") ?? "").trim();
  const matchId = String(formData.get("matchId") ?? "").trim() || null;
  const videoId = String(formData.get("videoId") ?? "").trim() || null;
  const sponsorId = String(formData.get("sponsorId") ?? "").trim() || null;

  if (!prompt) return { error: "Podaj polecenie dla AI." };

  try {
    const result = await createContentPostFromAi({
      clubId: access.clubId,
      userId: access.userId,
      prompt,
      matchId,
      videoId,
      sponsorId,
      canPublish: canPublishContent(access.roles),
      source: videoId ? "video" : matchId ? "match" : "generator",
    });
    revalidateContentPaths();
    return { success: "Materiały AI wygenerowane.", postId: result.postId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Błąd generowania." };
  }
}

export async function upsertContentPostAction(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canCreateContent(access.roles)) return { error: "Brak uprawnień." };

  const id = String(formData.get("id") ?? "").trim() || randomUUID();
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const bodyWebsite = String(formData.get("bodyWebsite") ?? "").trim() || null;
  const contentTypeRaw = String(formData.get("contentType") ?? "news");
  const statusRaw = String(formData.get("status") ?? "draft");
  const contentType = parseContentType(contentTypeRaw);
  const status = parseContentStatus(statusRaw) ?? "draft";
  const matchId = String(formData.get("matchId") ?? "").trim() || null;
  const videoId = String(formData.get("videoId") ?? "").trim() || null;
  const sponsorId = String(formData.get("sponsorId") ?? "").trim() || null;
  const scheduledAt = String(formData.get("scheduledAt") ?? "").trim() || null;

  if (!title) return { error: "Podaj tytuł materiału." };
  if (!contentType) return { error: "Nieprawidłowy typ treści." };

  if (["approved", "published", "rejected"].includes(status) && !canPublishContent(access.roles)) {
    return { error: "Brak uprawnień do tego statusu." };
  }

  if (!canPublishContent(access.roles) && !["draft", "pending_approval"].includes(status)) {
    return { error: "Możesz zapisać tylko szkic lub wysłać do akceptacji." };
  }

  const supabase = await createClient();
  const refError = await verifyContentReferences(supabase, access.clubId, {
    matchId,
    videoId,
    sponsorId,
  });
  if (refError) return { error: refError };

  const slug = slugifyContentTitle(title);

  const { error } = await supabase.from("content_posts").upsert({
    id,
    club_id: access.clubId,
    content_type: contentType,
    status,
    title,
    slug,
    summary,
    body_website: bodyWebsite,
    match_id: matchId,
    video_id: videoId,
    sponsor_id: sponsorId,
    scheduled_at: scheduledAt,
    created_by: access.userId,
  });

  if (error) return { error: error.message };

  if (scheduledAt) {
    await supabase.from("content_calendar").delete().eq("post_id", id).eq("club_id", access.clubId);
    await supabase.from("content_calendar").insert({
      post_id: id,
      club_id: access.clubId,
      scheduled_at: scheduledAt,
      all_day: false,
    });
  }

  revalidateContentPaths();
  return { success: "Materiał zapisany.", postId: id };
}

export async function submitContentForApprovalAction(postId: string): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canCreateContent(access.roles)) return { error: "Brak uprawnień." };

  const post = await getContentPostById(access.clubId, postId);
  if (!post) return { error: "Nie znaleziono materiału." };
  if (!["draft", "rejected"].includes(post.status)) {
    return { error: "Materiał nie może zostać wysłany do akceptacji w tym statusie." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_posts")
    .update({ status: "pending_approval" })
    .eq("id", postId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };

  await logContentApproval(access.clubId, postId, "submitted", access.userId, "Przesłano do akceptacji");
  revalidateContentPaths();
  return { success: "Materiał wysłany do akceptacji." };
}

export async function approveContentPostAction(postId: string): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canPublishContent(access.roles)) return { error: "Brak uprawnień do akceptacji." };

  const post = await getContentPostById(access.clubId, postId);
  if (!post) return { error: "Nie znaleziono materiału." };
  if (post.status !== "pending_approval") {
    return { error: "Materiał nie oczekuje na akceptację." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_posts")
    .update({
      status: "approved",
      approved_by: access.userId,
      approved_at: new Date().toISOString(),
      rejected_by: null,
      rejected_at: null,
      rejection_note: null,
    })
    .eq("id", postId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };

  await logContentApproval(access.clubId, postId, "approved", access.userId);
  revalidateContentPaths();
  return { success: "Materiał zaakceptowany." };
}

export async function rejectContentPostAction(postId: string, note: string): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canPublishContent(access.roles)) return { error: "Brak uprawnień." };

  const post = await getContentPostById(access.clubId, postId);
  if (!post) return { error: "Nie znaleziono materiału." };
  if (post.status !== "pending_approval") {
    return { error: "Materiał nie oczekuje na akceptację." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_posts")
    .update({
      status: "rejected",
      rejected_by: access.userId,
      rejected_at: new Date().toISOString(),
      rejection_note: note || null,
    })
    .eq("id", postId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };

  await logContentApproval(access.clubId, postId, "rejected", access.userId, note);
  revalidateContentPaths();
  return { success: "Materiał odrzucony." };
}

export async function publishContentPostAction(
  postId: string,
  publishToWebsite: boolean,
): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canPublishContent(access.roles)) return { error: "Brak uprawnień do publikacji." };

  const post = await getContentPostById(access.clubId, postId);
  if (!post) return { error: "Nie znaleziono materiału." };
  if (!["approved", "pending_approval"].includes(post.status)) {
    return { error: "Materiał musi być zaakceptowany lub oczekujący na akceptację przed publikacją." };
  }

  if (publishToWebsite) {
    const websiteResult = await publishContentToWebsite(access.clubId, access.userId, post);
    if (websiteResult.error) return { error: websiteResult.error };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_posts")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      approved_by: access.userId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", postId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };

  await supabase
    .from("content_channel_variants")
    .update({ status: "published", published_at: new Date().toISOString() })
    .eq("post_id", postId)
    .eq("club_id", access.clubId)
    .in("channel", DEFAULT_CHANNELS);

  await logContentApproval(access.clubId, postId, "published", access.userId, publishToWebsite ? "Strona + kanały" : "Kanały");
  revalidateContentPaths();
  return { success: publishToWebsite ? "Opublikowano na stronie i w kanałach." : "Opublikowano w Content Hub." };
}

export async function queueChannelVariantAction(
  postId: string,
  channelRaw: string,
): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canManageContent(access.roles)) return { error: "Brak uprawnień." };

  const channel = parseContentChannel(channelRaw);
  if (!channel) return { error: "Nieprawidłowy kanał." };

  const supabase = await createClient();
  const { count } = await supabase
    .from("content_channel_variants")
    .select("id", { count: "exact", head: true })
    .eq("club_id", access.clubId)
    .eq("status", "queued");

  const { error } = await supabase
    .from("content_channel_variants")
    .update({ status: "queued", queue_position: (count ?? 0) + 1 })
    .eq("post_id", postId)
    .eq("club_id", access.clubId)
    .eq("channel", channel);

  if (error) return { error: error.message };
  revalidateContentPaths();
  return { success: "Dodano do kolejki publikacji." };
}

export async function updateChannelVariantAction(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canCreateContent(access.roles)) return { error: "Brak uprawnień." };

  const variantId = String(formData.get("variantId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();

  if (!variantId || !body) return { error: "Podaj treść wariantu." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("content_channel_variants")
    .update({ title, body })
    .eq("id", variantId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateContentPaths();
  return { success: "Wariant zapisany." };
}

export async function addContentAssetAction(
  _prev: ContentActionState,
  formData: FormData,
): Promise<ContentActionState> {
  const access = await requireAccessContext();
  if (!canCreateContent(access.roles)) return { error: "Brak uprawnień." };

  const title = String(formData.get("title") ?? "").trim();
  const assetType = String(formData.get("assetType") ?? "photo");
  const postId = String(formData.get("postId") ?? "").trim() || null;
  const videoId = String(formData.get("videoId") ?? "").trim() || null;
  const videoClipId = String(formData.get("videoClipId") ?? "").trim() || null;

  if (!title) return { error: "Podaj tytuł zasobu." };
  if (!["photo", "graphic", "video_clip"].includes(assetType)) return { error: "Nieprawidłowy typ." };

  const supabase = await createClient();
  const refError = await verifyContentReferences(supabase, access.clubId, {
    postId,
    videoId,
    videoClipId,
  });
  if (refError) return { error: refError };

  const { error } = await supabase.from("content_assets").insert({
    club_id: access.clubId,
    post_id: postId,
    asset_type: assetType,
    title,
    video_id: videoId,
    video_clip_id: videoClipId,
    uploaded_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateContentPaths();
  return { success: "Zasób dodany do biblioteki." };
}
