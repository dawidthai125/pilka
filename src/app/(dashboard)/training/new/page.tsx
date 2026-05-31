import { redirect } from "next/navigation";

import { TrainingForm } from "@/features/training/components/training-form";
import { canManageTrainings } from "@/config/permissions";
import {
  getCoaches,
  getDashboardContext,
  getTeams,
  requireTrainingReadAccess,
} from "@/lib/auth/session";

export default async function NewTrainingPage() {
  const { access } = await getDashboardContext();
  requireTrainingReadAccess(access);

  if (!canManageTrainings(access.roles)) {
    redirect("/training");
  }

  const [teams, coaches] = await Promise.all([getTeams(), getCoaches()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nowy trening</h1>
        <p className="text-sm text-muted-foreground">Zaplanuj termin treningu dla drużyny.</p>
      </div>
      <TrainingForm teams={teams} coaches={coaches} mode="create" />
    </div>
  );
}
