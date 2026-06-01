import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";

export async function logAiTaskAction(
  taskId: string,
  clubId: string,
  userId: string,
  action: string,
  details: Record<string, unknown> = {},
): Promise<void> {
  const supabase = await createClient();
  await supabase.from("ai_task_logs").insert({
    club_id: clubId,
    task_id: taskId,
    user_id: userId,
    action,
    details: details as Json,
  });
}
