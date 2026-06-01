import { createClient } from "@/lib/supabase/server";
import { mapAiApproval, mapAiTask } from "@/lib/ai/agent/mappers";
import type { AiActionApproval, AiTask, AiTaskStatus } from "@/types/ai-agent";

export async function getAiManagerSnapshot(
  clubId: string,
): Promise<{ memory: string; pendingApprovals: AiActionApproval[] }> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_ai_manager_snapshot", { p_club_id: clubId });

  if (!data) {
    return { memory: "", pendingApprovals: [] };
  }

  const payload = data as {
    memory_summary?: string;
    pending_approvals?: Array<Parameters<typeof mapAiApproval>[0] & { club_id: string; user_id: string }>;
  };

  return {
    memory: payload.memory_summary ?? "",
    pendingApprovals: (payload.pending_approvals ?? []).map((row) =>
      mapAiApproval({
        id: row.id,
        task_id: row.task_id,
        tool_call_id: row.tool_call_id,
        risk_level: row.risk_level,
        status: row.status,
        preview: row.preview,
        created_at: row.created_at,
      }),
    ),
  };
}

export async function getAiTasksForUser(
  clubId: string,
  userId: string,
  status?: AiTaskStatus,
): Promise<AiTask[]> {
  const supabase = await createClient();
  let query = supabase
    .from("ai_tasks")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (status) query = query.eq("status", status);

  const { data } = await query;
  return (data ?? []).map((row) => mapAiTask(row as Parameters<typeof mapAiTask>[0]));
}

export async function getPendingAiApprovals(
  clubId: string,
  userId: string,
): Promise<AiActionApproval[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_action_approvals")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (data ?? []).map((row) => mapAiApproval(row as Parameters<typeof mapAiApproval>[0]));
}

export async function getAiTaskById(
  clubId: string,
  userId: string,
  taskId: string,
): Promise<AiTask | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  return data ? mapAiTask(data as Parameters<typeof mapAiTask>[0]) : null;
}
