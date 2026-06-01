import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/types/database";

type NotificationEventType = Database["public"]["Enums"]["notification_event_type"];

export type EnqueueNotificationInput = {
  clubId: string;
  userId: string;
  eventType: NotificationEventType;
  title: string;
  body: string;
  href?: string;
  payload?: Record<string, unknown>;
  scheduledAt?: Date;
};

/** Server-only: enqueue push/in-app delivery (processed by push dispatch). */
export async function enqueueNotification(input: EnqueueNotificationInput): Promise<string | null> {
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("notification_queue")
    .insert({
      club_id: input.clubId,
      user_id: input.userId,
      event_type: input.eventType,
      title: input.title,
      body: input.body,
      href: input.href ?? null,
      payload: (input.payload ?? {}) as Json,
      scheduled_at: input.scheduledAt?.toISOString() ?? new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    console.error("[notification-queue] enqueue failed:", error.message);
    return null;
  }

  return data.id;
}
