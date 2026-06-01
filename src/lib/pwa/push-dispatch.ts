import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/database";

type QueueRow = Database["public"]["Tables"]["notification_queue"]["Row"];
type PushSubscriptionRow = Database["public"]["Tables"]["push_subscriptions"]["Row"];

const BATCH_SIZE = 25;

function getVapidConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@footballclubos.local";

  if (!publicKey || !privateKey) {
    return null;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

async function isPushEnabledForEvent(
  userId: string,
  clubId: string,
  eventType: QueueRow["event_type"],
): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("notification_preferences")
    .select("push_enabled")
    .eq("user_id", userId)
    .eq("club_id", clubId)
    .eq("event_type", eventType)
    .maybeSingle();

  return data?.push_enabled ?? true;
}

async function markQueueItem(
  id: string,
  status: Database["public"]["Enums"]["notification_delivery_status"],
  errorMessage?: string,
): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("notification_queue")
    .update({
      status,
      sent_at: status === "sent" ? new Date().toISOString() : null,
      error_message: errorMessage ?? null,
    })
    .eq("id", id);
}

async function sendToSubscription(
  subscription: PushSubscriptionRow,
  payload: { title: string; body: string; href?: string | null; eventType: string },
): Promise<void> {
  await webpush.sendNotification(
    {
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    },
    JSON.stringify(payload),
  );
}

export type DispatchResult = {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
};

/** Process pending rows in notification_queue and deliver via Web Push. */
export async function dispatchPendingPushNotifications(): Promise<DispatchResult> {
  const vapid = getVapidConfig();
  if (!vapid) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: pending, error } = await admin
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error || !pending?.length) {
    return { processed: 0, sent: 0, failed: 0, skipped: 0 };
  }

  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of pending) {
    const pushEnabled = await isPushEnabledForEvent(item.user_id, item.club_id, item.event_type);
    if (!pushEnabled) {
      await markQueueItem(item.id, "cancelled", "Push disabled in preferences");
      skipped += 1;
      continue;
    }

    const { data: subscriptions } = await admin
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", item.user_id)
      .eq("club_id", item.club_id);

    if (!subscriptions?.length) {
      await markQueueItem(item.id, "cancelled", "No push subscription");
      skipped += 1;
      continue;
    }

    const payload = {
      title: item.title,
      body: item.body,
      href:
        item.href && item.href.startsWith("/") && !item.href.startsWith("//")
          ? item.href
          : "/notifications",
      eventType: item.event_type,
    };

    let delivered = false;
    let lastError: string | undefined;

    for (const sub of subscriptions) {
      try {
        await sendToSubscription(sub, payload);
        delivered = true;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "Push delivery failed";
        if (lastError.includes("410") || lastError.includes("404")) {
          await admin.from("push_subscriptions").delete().eq("id", sub.id);
        }
      }
    }

    if (delivered) {
      await markQueueItem(item.id, "sent");
      sent += 1;
    } else {
      await markQueueItem(item.id, "failed", lastError);
      failed += 1;
    }
  }

  return { processed: pending.length, sent, failed, skipped };
}
