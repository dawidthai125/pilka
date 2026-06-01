import { hasAnyPermission } from "@/lib/rbac/permissions";
import { getToolPermissions } from "@/lib/ai/agent/tools/registry";
import type { UserAccessContext } from "@/types/rbac";

export function assertToolPermission(access: UserAccessContext, toolName: string): void {
  const required = getToolPermissions(toolName);
  if (required.length === 0) {
    throw new Error("Nieznane narzędzie agenta.");
  }
  if (!hasAnyPermission(access, required)) {
    throw new Error("Brak uprawnień do wykonania tej akcji.");
  }
}
