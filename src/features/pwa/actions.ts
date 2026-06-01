"use server";

import { revalidatePath } from "next/cache";

import { requireAccessContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type PwaSettingsState = { error?: string; success?: string };

const EVENT_TYPES = [
  "training_tomorrow",
  "match_tomorrow",
  "schedule_change",
  "document_expiring",
  "fee_overdue",
  "ai_report_new",
  "general",
] as const;

export async function saveNotificationPreferences(
  _prev: PwaSettingsState,
  formData: FormData,
): Promise<PwaSettingsState> {
  const access = await requireAccessContext();
  const supabase = await createClient();

  for (const eventType of EVENT_TYPES) {
    const pushEnabled = formData.get(`push_${eventType}`) === "on";
    const inAppEnabled = formData.get(`inapp_${eventType}`) !== "off";

    const { error } = await supabase.from("notification_preferences").upsert(
      {
        club_id: access.clubId,
        user_id: access.userId,
        event_type: eventType,
        push_enabled: pushEnabled,
        in_app_enabled: inAppEnabled,
      },
      { onConflict: "user_id,club_id,event_type" },
    );

    if (error) return { error: error.message };
  }

  revalidatePath("/settings");
  return { success: "Preferencje powiadomień zapisane." };
}

export async function getNotificationPreferences() {
  const access = await requireAccessContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("club_id", access.clubId)
    .eq("user_id", access.userId);

  return data ?? [];
}
