import type {
  Announcement,
  AnnouncementCategory,
  AnnouncementPriority,
  AnnouncementStatus,
  AnnouncementVisibility,
  AttendanceResponse,
  ChatAttachment,
  ChatMessage,
  CoachMessage,
  CoachMessageStatus,
  TeamChat,
  TeamChatType,
} from "@/types/communication";

function str(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? "");
}

function optStr(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return v == null ? null : String(v);
}

function bool(row: Record<string, unknown>, key: string): boolean {
  return Boolean(row[key]);
}

export function mapAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    title: str(row, "title"),
    body: str(row, "body"),
    category: str(row, "category") as AnnouncementCategory,
    priority: str(row, "priority") as AnnouncementPriority,
    visibility: str(row, "visibility") as AnnouncementVisibility,
    targetTeamId: optStr(row, "target_team_id"),
    targetRole: optStr(row, "target_role"),
    status: str(row, "status") as AnnouncementStatus,
    createdBy: str(row, "created_by"),
    publishedAt: optStr(row, "published_at"),
    archivedAt: optStr(row, "archived_at"),
    aiGenerated: bool(row, "ai_generated"),
    createdAt: str(row, "created_at"),
    updatedAt: str(row, "updated_at"),
    readCount: row.read_count != null ? Number(row.read_count) : undefined,
    audienceCount: row.audience_count != null ? Number(row.audience_count) : undefined,
    isRead: row.is_read != null ? Boolean(row.is_read) : undefined,
  };
}

export function mapCoachMessage(row: Record<string, unknown>, teamName?: string): CoachMessage {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    teamId: str(row, "team_id"),
    teamName,
    title: str(row, "title"),
    body: str(row, "body"),
    status: str(row, "status") as CoachMessageStatus,
    requiresAttendance: bool(row, "requires_attendance"),
    createdBy: str(row, "created_by"),
    publishedAt: optStr(row, "published_at"),
    aiGenerated: bool(row, "ai_generated"),
    createdAt: str(row, "created_at"),
  };
}

export function mapTeamChat(row: Record<string, unknown>): TeamChat {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    chatType: str(row, "chat_type") as TeamChatType,
    teamId: optStr(row, "team_id"),
    sponsorId: optStr(row, "sponsor_id"),
    name: str(row, "name"),
    isActive: bool(row, "is_active"),
    lastMessageAt: optStr(row, "last_message_at"),
    lastMessagePreview: optStr(row, "last_message_preview"),
  };
}

export function mapChatMessage(row: Record<string, unknown>, senderName?: string): ChatMessage {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    chatId: str(row, "chat_id"),
    senderId: str(row, "sender_id"),
    senderName,
    body: str(row, "body"),
    isEmojiOnly: bool(row, "is_emoji_only"),
    createdAt: str(row, "created_at"),
  };
}

export function mapChatAttachment(row: Record<string, unknown>): ChatAttachment {
  return {
    id: str(row, "id"),
    messageId: str(row, "message_id"),
    storagePath: str(row, "storage_path"),
    fileName: str(row, "file_name"),
    mimeType: optStr(row, "mime_type"),
  };
}

export function mapAttendanceResponse(raw: string): AttendanceResponse | null {
  if (raw === "yes" || raw === "no" || raw === "unknown") return raw;
  return null;
}
