import type { Permission } from "@/types/rbac";

export type AiRiskLevel = "low" | "medium" | "high";

export type AiTaskStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "completed"
  | "cancelled"
  | "failed";

export type AiApprovalStatus = "pending" | "approved" | "rejected" | "expired";

export type AiToolCallStatus = "pending" | "success" | "failed" | "skipped";

export type AiToolName =
  | "getPlayers"
  | "getMatches"
  | "getTrainings"
  | "getSponsors"
  | "getFinances"
  | "getDocuments"
  | "getInventory"
  | "createTraining"
  | "createMatch"
  | "createNotification"
  | "generateReport"
  | "generateNews"
  | "getVideos"
  | "analyzeVideo"
  | "generateVideoSummary"
  | "getContentPosts"
  | "generateContentPost"
  | "proposeContentPublication"
  | "getLeagueInsights";

export type AiToolDefinition = {
  name: AiToolName;
  description: string;
  riskLevel: AiRiskLevel;
  permissions: Permission[];
  requiresApproval: boolean;
};

export type AiTask = {
  id: string;
  clubId: string;
  userId: string;
  conversationId: string | null;
  title: string;
  command: string;
  status: AiTaskStatus;
  resultSummary: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export type AiActionApproval = {
  id: string;
  taskId: string;
  toolCallId: string;
  riskLevel: AiRiskLevel;
  status: AiApprovalStatus;
  preview: Record<string, unknown>;
  createdAt: string;
};

export type AgentCommandResult = {
  taskId: string;
  status: AiTaskStatus;
  message: string;
  pendingApprovals?: number;
  data?: unknown;
};

export { AI_MANAGER_NAME } from "@/lib/ai/constants";

export const AI_TASK_STATUS_LABELS: Record<AiTaskStatus, string> = {
  pending: "Oczekujące",
  running: "W trakcie",
  awaiting_approval: "Wymaga zatwierdzenia",
  completed: "Wykonane",
  cancelled: "Anulowane",
  failed: "Błąd",
};

export const AI_RISK_LABELS: Record<AiRiskLevel, string> = {
  low: "Niskie",
  medium: "Średnie",
  high: "Wysokie",
};
