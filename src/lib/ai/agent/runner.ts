import { logAiTaskAction } from "@/lib/ai/agent/audit";
import { parseCommandToTools, summarizeToolResult } from "@/lib/ai/agent/intent";
import { updateAgentMemory } from "@/lib/ai/agent/memory";
import { buildAiClubContext } from "@/lib/ai/context";
import { assertToolPermission } from "@/lib/ai/agent/tools/permissions";
import { executeReadTool } from "@/lib/ai/agent/tools/read";
import {
  buildActionPreview,
  executeWriteTool,
} from "@/lib/ai/agent/tools/write";
import {
  getToolDefinition,
  getToolRiskLevel,
  toolRequiresApproval,
} from "@/lib/ai/agent/tools/registry";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import type { UserAccessContext } from "@/types/rbac";
import type { AgentCommandResult, AiToolName } from "@/types/ai-agent";

function titleFromCommand(command: string): string {
  return command.length > 80 ? `${command.slice(0, 77)}...` : command;
}

const READ_TOOLS: AiToolName[] = [
  "getPlayers",
  "getMatches",
  "getTrainings",
  "getSponsors",
  "getFinances",
  "getDocuments",
  "getInventory",
  "getVideos",
  "getContentPosts",
];

function isReadTool(name: AiToolName): boolean {
  return READ_TOOLS.includes(name);
}

export async function runAgentCommand(
  access: UserAccessContext,
  command: string,
  conversationId?: string | null,
): Promise<AgentCommandResult> {
  const supabase = await createClient();
  const trimmed = command.trim();
  if (!trimmed) {
    return { taskId: "", status: "failed", message: "Puste polecenie." };
  }

  const { data: task, error: taskError } = await supabase
    .from("ai_tasks")
    .insert({
      club_id: access.clubId,
      user_id: access.userId,
      conversation_id: conversationId ?? null,
      title: titleFromCommand(trimmed),
      command: trimmed,
      status: "running",
      metadata: { kind: "agent_command" } as Json,
    })
    .select("id")
    .single();

  if (taskError || !task) {
    return { taskId: "", status: "failed", message: taskError?.message ?? "Błąd tworzenia zadania." };
  }

  await logAiTaskAction(task.id, access.clubId, access.userId, "task_started", { command: trimmed });

  const toolCalls = parseCommandToTools(trimmed);
  if (toolCalls.length === 0) {
    const message = "Nie rozpoznano polecenia. Spróbuj sformułować inaczej.";
    await supabase
      .from("ai_tasks")
      .update({ status: "failed", result_summary: message })
      .eq("id", task.id);
    await logAiTaskAction(task.id, access.clubId, access.userId, "task_failed", {
      reason: "unrecognized_command",
    });
    return { taskId: task.id, status: "failed", message };
  }

  let pendingApprovals = 0;
  let toolFailures = 0;
  let toolsSucceeded = 0;
  const results: unknown[] = [];
  const readCalls = toolCalls.filter((call) => isReadTool(call.toolName));
  const sharedReadContext =
    readCalls.length > 0 ? await buildAiClubContext(access) : undefined;

  for (const call of toolCalls) {
    const def = getToolDefinition(call.toolName);
    if (!def) continue;

    try {
      assertToolPermission(access, call.toolName);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Brak uprawnień.";
      await supabase
        .from("ai_tasks")
        .update({ status: "failed", result_summary: message })
        .eq("id", task.id);
      await logAiTaskAction(task.id, access.clubId, access.userId, "task_failed", {
        reason: "permission_denied",
        tool: call.toolName,
      });
      return {
        taskId: task.id,
        status: "failed",
        message,
      };
    }

    const riskLevel = getToolRiskLevel(call.toolName);
    const needsApproval = toolRequiresApproval(call.toolName);

    const { data: toolRow } = await supabase
      .from("ai_tool_calls")
      .insert({
        club_id: access.clubId,
        task_id: task.id,
        user_id: access.userId,
        tool_name: call.toolName,
        tool_input: call.input as Json,
        risk_level: riskLevel,
        status: needsApproval ? "pending" : "pending",
      })
      .select("id")
      .single();

    if (!toolRow) continue;

    if (needsApproval && !isReadTool(call.toolName)) {
      await supabase.from("ai_action_approvals").insert({
        club_id: access.clubId,
        task_id: task.id,
        tool_call_id: toolRow.id,
        user_id: access.userId,
        risk_level: riskLevel,
        status: "pending",
        preview: buildActionPreview(call.toolName, call.input) as Json,
      });
      pendingApprovals += 1;
      continue;
    }

    try {
      let output: unknown;
      if (isReadTool(call.toolName)) {
        output = await executeReadTool(call.toolName, call.input, access, sharedReadContext);
      } else {
        const writeResult = await executeWriteTool(call.toolName, call.input, access);
        if (!writeResult.ok) {
          throw new Error(writeResult.error ?? "Błąd wykonania.");
        }
        output = writeResult.data;
      }

      await supabase
        .from("ai_tool_calls")
        .update({
          status: "success",
          tool_output: output as Json,
          executed_at: new Date().toISOString(),
        })
        .eq("id", toolRow.id);

      await logAiTaskAction(task.id, access.clubId, access.userId, "tool_executed", {
        tool: call.toolName,
      });
      results.push(output);
      toolsSucceeded += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Błąd narzędzia.";
      toolFailures += 1;
      await supabase
        .from("ai_tool_calls")
        .update({ status: "failed", error_message: message, executed_at: new Date().toISOString() })
        .eq("id", toolRow.id);
      await logAiTaskAction(task.id, access.clubId, access.userId, "tool_failed", {
        tool: call.toolName,
        error: message,
      });
    }
  }

  if (pendingApprovals > 0) {
    await supabase
      .from("ai_tasks")
      .update({ status: "awaiting_approval" })
      .eq("id", task.id);
    return {
      taskId: task.id,
      status: "awaiting_approval",
      message: `${pendingApprovals} akcji wymaga zatwierdzenia.`,
      pendingApprovals,
    };
  }

  if (toolFailures > 0) {
    const message =
      toolsSucceeded > 0
        ? `${toolFailures} narzędzi zakończyło się błędem.`
        : toolFailures === 1
          ? "Wykonanie narzędzia nie powiodło się."
          : "Wykonanie poleceń nie powiodło się.";
    await supabase
      .from("ai_tasks")
      .update({ status: "failed", result_summary: message })
      .eq("id", task.id);
    await logAiTaskAction(task.id, access.clubId, access.userId, "task_failed", {
      reason: "tool_errors",
      failures: toolFailures,
    });
    return { taskId: task.id, status: "failed", message };
  }

  const summary = summarizeToolResult(toolCalls[0]?.toolName ?? "getPlayers", results[0]);
  await supabase
    .from("ai_tasks")
    .update({
      status: "completed",
      result_summary: summary,
      completed_at: new Date().toISOString(),
    })
    .eq("id", task.id);

  await logAiTaskAction(task.id, access.clubId, access.userId, "task_completed", { summary });
  await updateAgentMemory(access.clubId, access.userId, trimmed, summary, conversationId);

  return {
    taskId: task.id,
    status: "completed",
    message: summary,
    data: results[0],
  };
}

export async function approveAgentAction(
  access: UserAccessContext,
  approvalId: string,
): Promise<AgentCommandResult> {
  const supabase = await createClient();

  const { data: approval } = await supabase
    .from("ai_action_approvals")
    .select("id, task_id, tool_call_id, risk_level")
    .eq("id", approvalId)
    .eq("club_id", access.clubId)
    .eq("user_id", access.userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!approval) {
    return { taskId: "", status: "failed", message: "Zatwierdzenie nie istnieje." };
  }

  const { data: toolCall } = await supabase
    .from("ai_tool_calls")
    .select("id, tool_name, tool_input, task_id")
    .eq("id", approval.tool_call_id)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!toolCall) {
    return { taskId: approval.task_id, status: "failed", message: "Wywołanie narzędzia nie istnieje." };
  }

  assertToolPermission(access, toolCall.tool_name);

  const result = await executeWriteTool(
    toolCall.tool_name as AiToolName,
    (toolCall.tool_input as Record<string, unknown>) ?? {},
    access,
  );

  if (!result.ok) {
    await supabase
      .from("ai_tool_calls")
      .update({ status: "failed", error_message: result.error, executed_at: new Date().toISOString() })
      .eq("id", toolCall.id);
    await logAiTaskAction(toolCall.task_id, access.clubId, access.userId, "tool_failed", {
      tool: toolCall.tool_name,
      error: result.error,
    });
    return { taskId: toolCall.task_id, status: "failed", message: result.error ?? "Błąd wykonania." };
  }

  await supabase
    .from("ai_tool_calls")
    .update({
      status: "success",
      tool_output: result.data as Json,
      executed_at: new Date().toISOString(),
    })
    .eq("id", toolCall.id);

  await supabase
    .from("ai_action_approvals")
    .update({
      status: "approved",
      decided_at: new Date().toISOString(),
      decided_by: access.userId,
    })
    .eq("id", approvalId);

  const summary = summarizeToolResult(toolCall.tool_name as AiToolName, result.data);

  const { data: pendingApprovals } = await supabase
    .from("ai_action_approvals")
    .select("id")
    .eq("task_id", toolCall.task_id)
    .eq("status", "pending");

  if (!pendingApprovals?.length) {
    await supabase
      .from("ai_tasks")
      .update({
        status: "completed",
        result_summary: summary,
        completed_at: new Date().toISOString(),
      })
      .eq("id", toolCall.task_id);
  }

  await logAiTaskAction(toolCall.task_id, access.clubId, access.userId, "action_approved", {
    tool: toolCall.tool_name,
  });

  return { taskId: toolCall.task_id, status: "completed", message: summary, data: result.data };
}

export async function rejectAgentAction(
  access: UserAccessContext,
  approvalId: string,
): Promise<AgentCommandResult> {
  const supabase = await createClient();

  const { data: approval } = await supabase
    .from("ai_action_approvals")
    .select("task_id, tool_call_id")
    .eq("id", approvalId)
    .eq("club_id", access.clubId)
    .eq("user_id", access.userId)
    .eq("status", "pending")
    .maybeSingle();

  if (!approval) {
    return { taskId: "", status: "failed", message: "Zatwierdzenie nie istnieje." };
  }

  await supabase
    .from("ai_action_approvals")
    .update({
      status: "rejected",
      decided_at: new Date().toISOString(),
      decided_by: access.userId,
    })
    .eq("id", approvalId);

  await supabase
    .from("ai_tool_calls")
    .update({ status: "skipped", executed_at: new Date().toISOString() })
    .eq("id", approval.tool_call_id);

  await supabase
    .from("ai_tasks")
    .update({ status: "cancelled", result_summary: "Odrzucone przez użytkownika." })
    .eq("id", approval.task_id);

  await logAiTaskAction(approval.task_id, access.clubId, access.userId, "action_rejected", {});

  return { taskId: approval.task_id, status: "cancelled", message: "Akcja odrzucona." };
}

export async function cancelAgentTask(
  access: UserAccessContext,
  taskId: string,
): Promise<AgentCommandResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_tasks")
    .update({ status: "cancelled", result_summary: "Anulowane przez użytkownika." })
    .eq("id", taskId)
    .eq("club_id", access.clubId)
    .eq("user_id", access.userId);

  if (error) return { taskId, status: "failed", message: error.message };
  await logAiTaskAction(taskId, access.clubId, access.userId, "task_cancelled", {});
  return { taskId, status: "cancelled", message: "Zadanie anulowane." };
}
