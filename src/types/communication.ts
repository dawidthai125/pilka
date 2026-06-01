export const ANNOUNCEMENT_CATEGORIES = [
  "club",
  "seniors",
  "juniors",
  "trampkarze",
  "mlodzicy",
  "sponsors",
  "board",
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export const ANNOUNCEMENT_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type AnnouncementPriority = (typeof ANNOUNCEMENT_PRIORITIES)[number];

export const ANNOUNCEMENT_VISIBILITIES = ["all", "team", "role"] as const;
export type AnnouncementVisibility = (typeof ANNOUNCEMENT_VISIBILITIES)[number];

export const ANNOUNCEMENT_STATUSES = ["draft", "published", "archived"] as const;
export type AnnouncementStatus = (typeof ANNOUNCEMENT_STATUSES)[number];

export const COACH_MESSAGE_STATUSES = ["draft", "published", "archived"] as const;
export type CoachMessageStatus = (typeof COACH_MESSAGE_STATUSES)[number];

export const ATTENDANCE_RESPONSES = ["yes", "no", "unknown"] as const;
export type AttendanceResponse = (typeof ATTENDANCE_RESPONSES)[number];

export const TEAM_CHAT_TYPES = ["team", "board", "sponsor"] as const;
export type TeamChatType = (typeof TEAM_CHAT_TYPES)[number];

export const COMMUNICATION_NOTIFICATION_KINDS = [
  "announcement",
  "coach_message",
  "chat_message",
  "training_change",
  "match_change",
] as const;

export type CommunicationNotificationKind = (typeof COMMUNICATION_NOTIFICATION_KINDS)[number];

export const ANNOUNCEMENT_CATEGORY_LABELS: Record<AnnouncementCategory, string> = {
  club: "Klub",
  seniors: "Seniorzy",
  juniors: "Juniorzy",
  trampkarze: "Trampkarze",
  mlodzicy: "Młodzicy",
  sponsors: "Sponsorzy",
  board: "Zarząd",
};

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<AnnouncementPriority, string> = {
  low: "Niski",
  normal: "Normalny",
  high: "Wysoki",
  urgent: "Pilny",
};

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: "Szkic",
  published: "Opublikowane",
  archived: "Archiwum",
};

export const ATTENDANCE_RESPONSE_LABELS: Record<AttendanceResponse, string> = {
  yes: "Tak",
  no: "Nie",
  unknown: "Nie wiem",
};

export const TEAM_CHAT_TYPE_LABELS: Record<TeamChatType, string> = {
  team: "Drużyna",
  board: "Zarząd",
  sponsor: "Sponsor",
};

export type Announcement = {
  id: string;
  clubId: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  visibility: AnnouncementVisibility;
  targetTeamId: string | null;
  targetRole: string | null;
  status: AnnouncementStatus;
  createdBy: string;
  publishedAt: string | null;
  archivedAt: string | null;
  aiGenerated: boolean;
  createdAt: string;
  updatedAt: string;
  readCount?: number;
  audienceCount?: number;
  isRead?: boolean;
};

export type CoachMessage = {
  id: string;
  clubId: string;
  teamId: string;
  teamName?: string;
  title: string;
  body: string;
  status: CoachMessageStatus;
  requiresAttendance: boolean;
  createdBy: string;
  publishedAt: string | null;
  aiGenerated: boolean;
  createdAt: string;
  attendanceSummary?: {
    yes: number;
    no: number;
    unknown: number;
    total: number;
  };
  userResponse?: AttendanceResponse | null;
};

export type TeamChat = {
  id: string;
  clubId: string;
  chatType: TeamChatType;
  teamId: string | null;
  sponsorId: string | null;
  name: string;
  isActive: boolean;
  lastMessageAt?: string | null;
  lastMessagePreview?: string | null;
};

export type ChatMessage = {
  id: string;
  clubId: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  body: string;
  isEmojiOnly: boolean;
  createdAt: string;
  attachments?: ChatAttachment[];
};

export type ChatAttachment = {
  id: string;
  messageId: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
};

export type CommunicationDashboardStats = {
  publishedAnnouncements: number;
  unreadAnnouncements: number;
  coachMessagesWeek: number;
  activeChats: number;
  pendingNotifications: number;
};

export type CommunicationFilters = {
  teamId?: string;
  authorId?: string;
  priority?: AnnouncementPriority;
  readStatus?: "read" | "unread" | "all";
  dateFrom?: string;
  dateTo?: string;
};
