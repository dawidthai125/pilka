import type { Json } from "@/types/database";
import type {
  AiConversation,
  AiMessage,
  AiReport,
  AiReportCategoryRow,
  AiSuggestion,
} from "@/types/ai";

export function mapAiConversation(row: {
  id: string;
  club_id: string;
  user_id: string;
  title: string;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  preview?: string | null;
}): AiConversation {
  return {
    id: row.id,
    clubId: row.club_id,
    userId: row.user_id,
    title: row.title,
    isPinned: row.is_pinned,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    preview: row.preview ?? null,
  };
}

export function mapAiMessage(row: {
  id: string;
  conversation_id: string;
  role: AiMessage["role"];
  content: string;
  created_at: string;
}): AiMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function mapAiReport(row: {
  id: string;
  club_id: string;
  category: AiReport["category"];
  report_type: AiReport["reportType"];
  title: string;
  content: string;
  status: AiReport["status"];
  metadata: Json | null;
  source_type: string | null;
  source_id: string | null;
  created_by: string | null;
  reviewed_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}): AiReport {
  return {
    id: row.id,
    clubId: row.club_id,
    category: row.category,
    reportType: row.report_type,
    title: row.title,
    content: row.content,
    status: row.status,
    metadata: (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {}) as Record<string, unknown>,
    sourceType: row.source_type,
    sourceId: row.source_id,
    createdBy: row.created_by,
    reviewedBy: row.reviewed_by,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAiSuggestion(row: {
  id: string;
  club_id: string;
  suggestion_type: AiSuggestion["suggestionType"];
  title: string;
  description: string;
  action_hint: string | null;
  metadata: Json | null;
  status: AiSuggestion["status"];
  created_at: string;
  updated_at: string;
}): AiSuggestion {
  return {
    id: row.id,
    clubId: row.club_id,
    suggestionType: row.suggestion_type,
    title: row.title,
    description: row.description,
    actionHint: row.action_hint,
    metadata: (row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? row.metadata
      : {}) as Record<string, unknown>,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAiReportCategory(row: {
  id: AiReportCategoryRow["id"];
  label: string;
  sort_order: number;
}): AiReportCategoryRow {
  return { id: row.id, label: row.label, sortOrder: row.sort_order };
}
