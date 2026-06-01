import { createAdminClient } from "@/lib/supabase/admin";

export async function notifyCrmTaskReminder(
  clubId: string,
  userId: string,
  taskId: string,
  title: string,
  body: string,
): Promise<void> {
  const admin = createAdminClient();

  await admin.from("club_notifications").insert({
    club_id: clubId,
    user_id: userId,
    title,
    body,
    href: "/crm/tasks",
    delivery_channels: ["in_app"],
    scheduled_at: new Date().toISOString(),
  });

  await admin.from("notification_queue").insert({
    club_id: clubId,
    user_id: userId,
    event_type: "crm_task_reminder" as "general",
    title,
    body,
    href: "/crm/tasks",
    payload: { taskId },
    status: "pending",
  });
}
