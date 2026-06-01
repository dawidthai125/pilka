import type {
  Video,
  VideoClip,
  VideoEvent,
  VideoJob,
  VideoNewsDraft,
  VideoNote,
  VideoReport,
  VideoShare,
} from "@/types/video";

type JsonArray = string[] | null | unknown;

function parseStringArray(value: JsonArray): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseKeyMoments(value: unknown): VideoReport["keyMoments"] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      minute: typeof item.minute === "number" ? item.minute : undefined,
      label: String(item.label ?? ""),
      description: String(item.description ?? ""),
    }));
}

export function mapVideo(row: Record<string, unknown>): Video {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    uploadedBy: String(row.uploaded_by),
    title: String(row.title),
    description: (row.description as string | null) ?? null,
    category: row.category as Video["category"],
    storagePath: (row.storage_path as string | null) ?? null,
    fileName: (row.file_name as string | null) ?? null,
    mimeType: (row.mime_type as string | null) ?? null,
    fileSizeBytes: row.file_size_bytes != null ? Number(row.file_size_bytes) : null,
    durationSeconds: row.duration_seconds != null ? Number(row.duration_seconds) : null,
    thumbnailUrl: (row.thumbnail_url as string | null) ?? null,
    matchId: (row.match_id as string | null) ?? null,
    trainingId: (row.training_id as string | null) ?? null,
    opponentName: (row.opponent_name as string | null) ?? null,
    jobStatus: row.job_status as Video["jobStatus"],
    jobError: (row.job_error as string | null) ?? null,
    viewCount: Number(row.view_count ?? 0),
    isPublicWithinClub: Boolean(row.is_public_within_club),
    recordedAt: (row.recorded_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapVideoJob(row: Record<string, unknown>): VideoJob {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    videoId: String(row.video_id),
    status: row.status as VideoJob["status"],
    step: String(row.step),
    progressPercent: Number(row.progress_percent ?? 0),
    errorMessage: (row.error_message as string | null) ?? null,
    startedAt: (row.started_at as string | null) ?? null,
    completedAt: (row.completed_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapVideoReport(row: Record<string, unknown>): VideoReport {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    videoId: String(row.video_id),
    reportType: row.report_type as VideoReport["reportType"],
    title: String(row.title),
    summary: (row.summary as string | null) ?? null,
    strengths: parseStringArray(row.strengths as JsonArray),
    weaknesses: parseStringArray(row.weaknesses as JsonArray),
    keyMoments: parseKeyMoments(row.key_moments),
    coachingRecommendations: parseStringArray(row.coaching_recommendations as JsonArray),
    extraSections: (row.extra_sections as Record<string, unknown>) ?? {},
    generatedByAi: Boolean(row.generated_by_ai),
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapVideoEvent(row: Record<string, unknown>): VideoEvent {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    videoId: String(row.video_id),
    eventType: row.event_type as VideoEvent["eventType"],
    source: row.source as VideoEvent["source"],
    timestampSeconds: Number(row.timestamp_seconds),
    label: (row.label as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    playerName: (row.player_name as string | null) ?? null,
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapVideoNote(row: Record<string, unknown>): VideoNote {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    videoId: String(row.video_id),
    authorId: String(row.author_id),
    timestampSeconds: Number(row.timestamp_seconds),
    content: String(row.content),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapVideoClip(row: Record<string, unknown>): VideoClip {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    videoId: String(row.video_id),
    title: String(row.title),
    category: row.category as VideoClip["category"],
    startSeconds: Number(row.start_seconds),
    endSeconds: Number(row.end_seconds),
    createdBy: String(row.created_by),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapVideoShare(row: Record<string, unknown>): VideoShare {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    videoId: String(row.video_id),
    sharedWithUserId: String(row.shared_with_user_id),
    sharedBy: String(row.shared_by),
    playerId: (row.player_id as string | null) ?? null,
    note: (row.note as string | null) ?? null,
    expiresAt: (row.expires_at as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export function mapVideoNewsDraft(row: Record<string, unknown>): VideoNewsDraft {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    videoId: String(row.video_id),
    reportId: (row.report_id as string | null) ?? null,
    draftType: row.draft_type as VideoNewsDraft["draftType"],
    title: String(row.title),
    content: String(row.content),
    status: row.status as VideoNewsDraft["status"],
    approvedBy: (row.approved_by as string | null) ?? null,
    approvedAt: (row.approved_at as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function formatVideoTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function parseVideoTimestamp(value: string): number | null {
  const match = value.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}
