import { createAdminClient } from "@/lib/supabase/admin";
import { getTeamMemberUserIds } from "@/lib/communication/dispatch";

export async function notifyMatchSquadCall(
  clubId: string,
  matchId: string,
  teamId: string,
  title: string,
  body: string,
): Promise<void> {
  const recipients = await getTeamMemberUserIds(clubId, teamId);
  const admin = createAdminClient();

  for (const userId of recipients) {
    await admin.from("club_notifications").insert({
      club_id: clubId,
      user_id: userId,
      title,
      body,
      href: `/attendance/matches/${matchId}`,
      delivery_channels: ["in_app"],
      scheduled_at: new Date().toISOString(),
    });

    await admin.from("notification_queue").insert({
      club_id: clubId,
      user_id: userId,
      event_type: "match_squad_call" as "general",
      title,
      body,
      href: `/attendance/matches/${matchId}`,
      payload: { matchId },
      status: "pending",
    });
  }
}
