import { createClient } from "@/lib/supabase/server";

import { AI_MAX_MESSAGES_PER_HOUR } from "./constants";

export const AI_MAX_REPORTS_PER_HOUR = 10;

export class AiRateLimitError extends Error {
  constructor(message?: string) {
    super(
      message ??
        `Osiągnięto limit ${AI_MAX_MESSAGES_PER_HOUR} wiadomości AI na godzinę. Spróbuj ponownie później.`,
    );
    this.name = "AiRateLimitError";
  }
}

export class AiReportRateLimitError extends Error {
  constructor() {
    super(
      `Osiągnięto limit ${AI_MAX_REPORTS_PER_HOUR} raportów AI na godzinę. Spróbuj ponownie później.`,
    );
    this.name = "AiReportRateLimitError";
  }
}

export async function assertAiChatRateLimit(userId: string, clubId: string): Promise<void> {
  const supabase = await createClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data: conversations, error: conversationsError } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", userId);

  if (conversationsError) {
    throw new Error(conversationsError.message);
  }

  const conversationIds = (conversations ?? []).map((row) => row.id);
  if (conversationIds.length === 0) {
    return;
  }

  const { count, error } = await supabase
    .from("ai_messages")
    .select("id", { count: "exact", head: true })
    .eq("role", "user")
    .gte("created_at", oneHourAgo)
    .in("conversation_id", conversationIds);

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) >= AI_MAX_MESSAGES_PER_HOUR) {
    throw new AiRateLimitError();
  }
}

export async function assertAiReportRateLimit(userId: string, clubId: string): Promise<void> {
  const supabase = await createClient();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await supabase
    .from("ai_reports")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("created_by", userId)
    .gte("created_at", oneHourAgo);

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) >= AI_MAX_REPORTS_PER_HOUR) {
    throw new AiReportRateLimitError();
  }
}
