import {
  mapBool as bool,
  mapJsonObj as jsonObj,
  mapNullableStr as nullableStr,
  mapNum as num,
  mapStr as str,
} from "@/lib/mappers/row-helpers";
import { slugifyTitle } from "@/lib/strings";
import type {
  ContentApproval,
  ContentAsset,
  ContentCalendarEntry,
  ContentChannelConfig,
  ContentChannelVariant,
  ContentAiGeneration,
  ContentPost,
} from "@/types/content";

function jsonTags(row: Record<string, unknown>, key: string): string[] {
  const value = row[key];
  return Array.isArray(value) ? value.map(String) : [];
}

export function mapContentPost(row: Record<string, unknown>): ContentPost {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    contentType: str(row, "content_type") as ContentPost["contentType"],
    status: str(row, "status") as ContentPost["status"],
    title: str(row, "title"),
    slug: nullableStr(row, "slug"),
    summary: nullableStr(row, "summary"),
    bodyWebsite: nullableStr(row, "body_website"),
    matchId: nullableStr(row, "match_id"),
    videoId: nullableStr(row, "video_id"),
    videoReportId: nullableStr(row, "video_report_id"),
    sponsorId: nullableStr(row, "sponsor_id"),
    websiteNewsId: nullableStr(row, "website_news_id"),
    scheduledAt: nullableStr(row, "scheduled_at"),
    publishedAt: nullableStr(row, "published_at"),
    createdBy: str(row, "created_by"),
    approvedBy: nullableStr(row, "approved_by"),
    approvedAt: nullableStr(row, "approved_at"),
    rejectedBy: nullableStr(row, "rejected_by"),
    rejectedAt: nullableStr(row, "rejected_at"),
    rejectionNote: nullableStr(row, "rejection_note"),
    aiGenerated: bool(row, "ai_generated"),
    metadata: jsonObj(row, "metadata"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

export function mapContentChannelVariant(row: Record<string, unknown>): ContentChannelVariant {
  return {
    id: str(row, "id"),
    postId: str(row, "post_id"),
    clubId: str(row, "club_id"),
    channel: str(row, "channel") as ContentChannelVariant["channel"],
    title: nullableStr(row, "title"),
    body: str(row, "body"),
    status: str(row, "status") as ContentChannelVariant["status"],
    queuePosition: num(row, "queue_position"),
    scheduledAt: nullableStr(row, "scheduled_at"),
    publishedAt: nullableStr(row, "published_at"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

export function mapContentChannelConfig(row: Record<string, unknown>): ContentChannelConfig {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    channel: str(row, "channel") as ContentChannelConfig["channel"],
    isEnabled: bool(row, "is_enabled"),
    autoQueue: bool(row, "auto_queue"),
    settings: jsonObj(row, "settings"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

export function mapContentApproval(row: Record<string, unknown>): ContentApproval {
  return {
    id: str(row, "id"),
    postId: str(row, "post_id"),
    clubId: str(row, "club_id"),
    channelVariantId: nullableStr(row, "channel_variant_id"),
    action: str(row, "action") as ContentApproval["action"],
    actorId: str(row, "actor_id"),
    note: nullableStr(row, "note"),
    createdAt: str(row, "created_at"),
  };
}

export function mapContentCalendarEntry(row: Record<string, unknown>): ContentCalendarEntry {
  return {
    id: str(row, "id"),
    postId: str(row, "post_id"),
    clubId: str(row, "club_id"),
    scheduledAt: str(row, "scheduled_at"),
    allDay: bool(row, "all_day"),
    reminderSent: bool(row, "reminder_sent"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

export function mapContentAsset(row: Record<string, unknown>): ContentAsset {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    postId: nullableStr(row, "post_id"),
    assetType: str(row, "asset_type") as ContentAsset["assetType"],
    title: str(row, "title"),
    storagePath: nullableStr(row, "storage_path"),
    fileName: nullableStr(row, "file_name"),
    mimeType: nullableStr(row, "mime_type"),
    fileSizeBytes: row.file_size_bytes == null ? null : num(row, "file_size_bytes"),
    videoId: nullableStr(row, "video_id"),
    videoClipId: nullableStr(row, "video_clip_id"),
    uploadedBy: str(row, "uploaded_by"),
    tags: jsonTags(row, "tags"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
  };
}

export function mapContentAiGeneration(row: Record<string, unknown>): ContentAiGeneration {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    postId: nullableStr(row, "post_id"),
    generationType: str(row, "generation_type"),
    promptSummary: str(row, "prompt_summary"),
    model: nullableStr(row, "model"),
    source: str(row, "source"),
    createdBy: str(row, "created_by"),
    metadata: jsonObj(row, "metadata"),
    createdAt: str(row, "created_at"),
  };
}

export const slugifyContentTitle = slugifyTitle;
