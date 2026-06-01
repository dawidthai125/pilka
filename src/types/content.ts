export const CONTENT_TYPES = [
  "news",
  "match_report",
  "match_preview",
  "round_summary",
  "sponsor_post",
  "anniversary_post",
  "club_announcement",
  "photo_gallery",
  "ai_report",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = [
  "draft",
  "pending_approval",
  "approved",
  "published",
  "rejected",
] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const CONTENT_CHANNELS = [
  "website",
  "facebook",
  "instagram",
  "sponsor",
  "club_announcement",
] as const;

export type ContentChannel = (typeof CONTENT_CHANNELS)[number];

export const CONTENT_CHANNEL_STATUSES = ["draft", "queued", "approved", "published"] as const;

export type ContentChannelStatus = (typeof CONTENT_CHANNEL_STATUSES)[number];

export const CONTENT_APPROVAL_ACTIONS = ["submitted", "approved", "rejected", "published"] as const;

export type ContentApprovalAction = (typeof CONTENT_APPROVAL_ACTIONS)[number];

export const CONTENT_ASSET_TYPES = ["photo", "graphic", "video_clip"] as const;

export type ContentAssetType = (typeof CONTENT_ASSET_TYPES)[number];

export type ContentPost = {
  id: string;
  clubId: string;
  contentType: ContentType;
  status: ContentStatus;
  title: string;
  slug: string | null;
  summary: string | null;
  bodyWebsite: string | null;
  matchId: string | null;
  videoId: string | null;
  videoReportId: string | null;
  sponsorId: string | null;
  websiteNewsId: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionNote: string | null;
  aiGenerated: boolean;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ContentChannelVariant = {
  id: string;
  postId: string;
  clubId: string;
  channel: ContentChannel;
  title: string | null;
  body: string;
  status: ContentChannelStatus;
  queuePosition: number;
  scheduledAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ContentChannelConfig = {
  id: string;
  clubId: string;
  channel: ContentChannel;
  isEnabled: boolean;
  autoQueue: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type ContentApproval = {
  id: string;
  postId: string;
  clubId: string;
  channelVariantId: string | null;
  action: ContentApprovalAction;
  actorId: string;
  note: string | null;
  createdAt: string;
};

export type ContentCalendarEntry = {
  id: string;
  postId: string;
  clubId: string;
  scheduledAt: string;
  allDay: boolean;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContentAsset = {
  id: string;
  clubId: string;
  postId: string | null;
  assetType: ContentAssetType;
  title: string;
  storagePath: string | null;
  fileName: string | null;
  mimeType: string | null;
  fileSizeBytes: number | null;
  videoId: string | null;
  videoClipId: string | null;
  uploadedBy: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type ContentAiGeneration = {
  id: string;
  clubId: string;
  postId: string | null;
  generationType: string;
  promptSummary: string;
  model: string | null;
  source: string;
  createdBy: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type ContentDashboardStats = {
  totalPosts: number;
  pendingApproval: number;
  scheduled: number;
  publishedThisMonth: number;
  queuedSocial: number;
};

export const CONTENT_TYPE_LABELS: Record<ContentType, string> = {
  news: "Aktualność",
  match_report: "Relacja meczowa",
  match_preview: "Zapowiedź meczu",
  round_summary: "Podsumowanie kolejki",
  sponsor_post: "Post sponsorski",
  anniversary_post: "Post jubileuszowy",
  club_announcement: "Komunikat klubowy",
  photo_gallery: "Galeria zdjęć",
  ai_report: "Raport AI",
};

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  draft: "Szkic",
  pending_approval: "Oczekuje na akceptację",
  approved: "Zaakceptowany",
  published: "Opublikowany",
  rejected: "Odrzucony",
};

export const CONTENT_CHANNEL_LABELS: Record<ContentChannel, string> = {
  website: "Strona klubowa",
  facebook: "Facebook",
  instagram: "Instagram",
  sponsor: "Sponsor",
  club_announcement: "Komunikat klubowy",
};

export const CONTENT_CHANNEL_STATUS_LABELS: Record<ContentChannelStatus, string> = {
  draft: "Szkic",
  queued: "W kolejce",
  approved: "Zaakceptowany",
  published: "Opublikowany",
};

export const CONTENT_ASSET_TYPE_LABELS: Record<ContentAssetType, string> = {
  photo: "Zdjęcie",
  graphic: "Grafika",
  video_clip: "Klip wideo",
};

export const CONTENT_APPROVAL_ACTION_LABELS: Record<ContentApprovalAction, string> = {
  submitted: "Przesłano do akceptacji",
  approved: "Zaakceptowano",
  rejected: "Odrzucono",
  published: "Opublikowano",
};
