"use server";

import { revalidatePath } from "next/cache";

import { canUseAiChat } from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { buildAutomationProposals } from "@/lib/ai/agent/automations";
import { getAgentMemory } from "@/lib/ai/agent/memory";
import {
  approveAgentAction,
  cancelAgentTask,
  rejectAgentAction,
  runAgentCommand,
} from "@/lib/ai/agent/runner";
import type { AgentCommandResult } from "@/types/ai-agent";

export type AiManagerActionState = {
  error?: string;
  success?: string;
  result?: AgentCommandResult;
};

function revalidateAgentPaths() {
  revalidatePath("/ai");
  revalidatePath("/ai/manager");
  revalidatePath("/ai/tasks");
}

export async function executeAgentCommand(
  _prev: AiManagerActionState,
  formData: FormData,
): Promise<AiManagerActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień do AI Club Manager." };

  const command = String(formData.get("command") ?? "").trim();
  if (!command) return { error: "Wpisz polecenie." };

  const conversationId = formData.get("conversationId")
    ? String(formData.get("conversationId"))
    : null;

  try {
    const result = await runAgentCommand(access, command, conversationId);
    revalidateAgentPaths();
    return {
      success: result.message,
      result,
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd agenta." };
  }
}

export async function approveAiAction(approvalId: string): Promise<AiManagerActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };

  try {
    const result = await approveAgentAction(access, approvalId);
    revalidateAgentPaths();
    return { success: result.message, result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd zatwierdzenia." };
  }
}

export async function rejectAiAction(approvalId: string): Promise<AiManagerActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };

  try {
    const result = await rejectAgentAction(access, approvalId);
    revalidateAgentPaths();
    return { success: result.message, result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd odrzucenia." };
  }
}

export async function cancelAiTask(taskId: string): Promise<AiManagerActionState> {
  const access = await requireAccessContext();
  if (!canUseAiChat(access.roles)) return { error: "Brak uprawnień." };

  try {
    const result = await cancelAgentTask(access, taskId);
    revalidateAgentPaths();
    return { success: result.message, result };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Błąd anulowania." };
  }
}

export async function getAgentContextForUi() {
  const access = await requireAccessContext();
  const [memory, automations] = await Promise.all([
    getAgentMemory(access.clubId, access.userId),
    buildAutomationProposals(access.clubId),
  ]);
  return { memory, automations };
}
