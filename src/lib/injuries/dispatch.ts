import { createAdminClient } from "@/lib/supabase/admin";

type InjuryNotifyEvent =
  | "injury_reported"
  | "injury_return_training"
  | "injury_return_match";

async function dispatchInjuryNotification(
  clubId: string,
  userId: string,
  eventType: InjuryNotifyEvent,
  title: string,
  body: string,
  href: string,
  payload: Record<string, string>,
): Promise<void> {
  const admin = createAdminClient();

  await admin.from("club_notifications").insert({
    club_id: clubId,
    user_id: userId,
    title,
    body,
    href,
    delivery_channels: ["in_app"],
    scheduled_at: new Date().toISOString(),
  });

  await admin.from("notification_queue").insert({
    club_id: clubId,
    user_id: userId,
    event_type: eventType as "general",
    title,
    body,
    href,
    payload,
    status: "pending",
  });
}

export async function notifyInjuryReported(
  clubId: string,
  userIds: string[],
  playerName: string,
  injuryId: string,
): Promise<void> {
  for (const userId of userIds) {
    await dispatchInjuryNotification(
      clubId,
      userId,
      "injury_reported",
      "Nowy uraz zgłoszony",
      `${playerName} — zgłoszono uraz. Sprawdź dostępność w module Injury & Medical.`,
      `/injuries/${injuryId}`,
      { injuryId },
    );
  }
}

export async function notifyReturnToTraining(
  clubId: string,
  userIds: string[],
  playerName: string,
  injuryId: string,
): Promise<void> {
  for (const userId of userIds) {
    await dispatchInjuryNotification(
      clubId,
      userId,
      "injury_return_training",
      "Powrót do treningów",
      `${playerName} — zaktualizowano status powrotu do treningów.`,
      `/injuries/${injuryId}`,
      { injuryId },
    );
  }
}

export async function notifyReturnToMatch(
  clubId: string,
  userIds: string[],
  playerName: string,
  injuryId: string,
): Promise<void> {
  for (const userId of userIds) {
    await dispatchInjuryNotification(
      clubId,
      userId,
      "injury_return_match",
      "Powrót do meczu",
      `${playerName} — zaktualizowano dostępność meczową.`,
      `/injuries/${injuryId}`,
      { injuryId },
    );
  }
}
