import { redirect } from "next/navigation";

import { CoachDashboard } from "@/features/training/components/coach-dashboard";
import { canManageTrainings } from "@/config/permissions";
import {
  getCoachDashboard,
  getDashboardContext,
  requireTrainingReadAccess,
} from "@/lib/auth/session";

export default async function CoachPanelPage() {
  const { access } = await getDashboardContext();
  requireTrainingReadAccess(access);

  if (!canManageTrainings(access.roles)) {
    redirect("/training");
  }

  const data = await getCoachDashboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Panel trenera</h1>
        <p className="text-sm text-muted-foreground">
          Najbliższe treningi, potwierdzenia obecności, kontuzje i frekwencja kadry.
        </p>
      </div>
      <CoachDashboard data={data} />
    </div>
  );
}
