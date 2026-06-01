import type { AiActionApproval, AiTask, AiTaskStatus } from "@/types/ai-agent";

type TaskRow = {
  id: string;
  club_id: string;
  user_id: string;
  conversation_id: string | null;
  title: string;
  command: string;
  status: AiTaskStatus;
  result_summary: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
};

type ApprovalRow = {
  id: string;
  task_id: string;
  tool_call_id: string;
  risk_level: AiActionApproval["riskLevel"];
  status: AiActionApproval["status"];
  preview: Record<string, unknown> | null;
  created_at: string;
};

export function mapAiTask(row: TaskRow): AiTask {
  return {
    id: row.id,
    clubId: row.club_id,
    userId: row.user_id,
    conversationId: row.conversation_id,
    title: row.title,
    command: row.command,
    status: row.status,
    resultSummary: row.result_summary,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function mapAiApproval(row: ApprovalRow): AiActionApproval {
  return {
    id: row.id,
    taskId: row.task_id,
    toolCallId: row.tool_call_id,
    riskLevel: row.risk_level,
    status: row.status,
    preview: (row.preview ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}
