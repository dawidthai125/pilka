import { AgentManagerDashboard } from "@/features/ai-manager/components/agent-manager-dashboard";
import { buildAutomationProposals } from "@/lib/ai/agent/automations";
import { getAiManagerSnapshot } from "@/lib/ai/agent/loaders";
import { getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";

export default async function AiManagerPage() {
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);

  const [{ memory, pendingApprovals }, automations] = await Promise.all([
    getAiManagerSnapshot(access.clubId),
    buildAutomationProposals(access.clubId),
  ]);

  return (
    <AgentManagerDashboard
      memory={memory}
      automations={automations}
      pendingApprovals={pendingApprovals}
    />
  );
}
