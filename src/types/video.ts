export const VIDEO_CATEGORIES = [
  "match",
  "training",
  "opponent_analysis",
  "educational",
] as const;

export type VideoCategory = (typeof VIDEO_CATEGORIES)[number];

export const VIDEO_JOB_STATUSES = ["pending", "processing", "ready", "error"] as const;

export type VideoJobStatus = (typeof VIDEO_JOB_STATUSES)[number];

export const VIDEO_REPORT_TYPES = ["match", "training", "opponent"] as const;

export type VideoReportType = (typeof VIDEO_REPORT_TYPES)[number];

export const VIDEO_EVENT_TYPES = [
  "goal",
  "chance",
  "foul",
  "corner",
  "free_kick",
  "card",
  "substitution",
] as const;

export type VideoEventType = (typeof VIDEO_EVENT_TYPES)[number];

export const VIDEO_EVENT_SOURCES = ["manual", "ai_suggested", "ai_confirmed"] as const;

export type VideoEventSource = (typeof VIDEO_EVENT_SOURCES)[number];

export const VIDEO_CLIP_CATEGORIES = ["goal", "offensive", "defensive", "custom"] as const;

export type VideoClipCategory = (typeof VIDEO_CLIP_CATEGORIES)[number];

export const VIDEO_NEWS_DRAFT_STATUSES = ["pending_approval", "approved", "rejected"] as const;

export type VideoNewsDraftStatus = (typeof VIDEO_NEWS_DRAFT_STATUSES)[number];

export type Video = {
  id: string;
  clubId: string;
  uploadedBy: string;
  title: string;
  description: string | null;
  category: VideoCategory;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  durationSeconds: number | null;
  thumbnailUrl: string | null;
  matchId: string | null;
  trainingId: string | null;
  opponentName: string | null;
  jobStatus: VideoJobStatus;
  jobError: string | null;
  viewCount: number;
  isPublicWithinClub: boolean;
  recordedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VideoJob = {
  id: string;
  clubId: string;
  videoId: string;
  status: VideoJobStatus;
  step: string;
  progressPercent: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VideoReport = {
  id: string;
  clubId: string;
  videoId: string;
  reportType: VideoReportType;
  title: string;
  summary: string | null;
  strengths: string[];
  weaknesses: string[];
  keyMoments: Array<{ minute?: number; label: string; description: string }>;
  coachingRecommendations: string[];
  extraSections: Record<string, unknown>;
  generatedByAi: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VideoEvent = {
  id: string;
  clubId: string;
  videoId: string;
  eventType: VideoEventType;
  source: VideoEventSource;
  timestampSeconds: number;
  label: string | null;
  description: string | null;
  playerName: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VideoNote = {
  id: string;
  clubId: string;
  videoId: string;
  authorId: string;
  timestampSeconds: number;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type VideoClip = {
  id: string;
  clubId: string;
  videoId: string;
  title: string;
  category: VideoClipCategory;
  startSeconds: number;
  endSeconds: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type VideoShare = {
  id: string;
  clubId: string;
  videoId: string;
  sharedWithUserId: string;
  sharedBy: string;
  playerId: string | null;
  note: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type VideoNewsDraft = {
  id: string;
  clubId: string;
  videoId: string;
  reportId: string | null;
  draftType: "club_news" | "facebook_post" | "match_summary";
  title: string;
  content: string;
  status: VideoNewsDraftStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VideoDashboardStats = {
  recentCount: number;
  pendingJobs: number;
  readyReports: number;
  pendingNewsDrafts: number;
  topViewed: Array<{ id: string; title: string; viewCount: number }>;
};

export const VIDEO_CATEGORY_LABELS: Record<VideoCategory, string> = {
  match: "Mecze",
  training: "Treningi",
  opponent_analysis: "Analiza przeciwnika",
  educational: "Materiały szkoleniowe",
};

export const VIDEO_JOB_STATUS_LABELS: Record<VideoJobStatus, string> = {
  pending: "Oczekuje",
  processing: "Przetwarzanie",
  ready: "Gotowe",
  error: "Błąd",
};

export const VIDEO_EVENT_TYPE_LABELS: Record<VideoEventType, string> = {
  goal: "Gol",
  chance: "Sytuacja bramkowa",
  foul: "Faul",
  corner: "Rzut rożny",
  free_kick: "Rzut wolny",
  card: "Kartka",
  substitution: "Zmiana",
};

export const VIDEO_REPORT_TYPE_LABELS: Record<VideoReportType, string> = {
  match: "Raport meczowy",
  training: "Raport treningowy",
  opponent: "Analiza przeciwnika",
};

export const VIDEO_CLIP_CATEGORY_LABELS: Record<VideoClipCategory, string> = {
  goal: "Gole",
  offensive: "Akcje ofensywne",
  defensive: "Akcje defensywne",
  custom: "Własne",
};

export const VIDEO_NEWS_DRAFT_TYPE_LABELS: Record<VideoNewsDraft["draftType"], string> = {
  club_news: "Aktualność klubowa",
  facebook_post: "Post Facebook",
  match_summary: "Podsumowanie meczu",
};
