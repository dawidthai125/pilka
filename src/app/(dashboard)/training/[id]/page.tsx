import Link from "next/link";
import { notFound } from "next/navigation";

import { TrainingDetailView } from "@/features/training/components/training-detail-view";
import { TrainingForm } from "@/features/training/components/training-form";
import {
  canManageTrainings,
  canMarkTrainingAttendance,
  canSetTrainingAvailability,
} from "@/config/permissions";
import {
  getCoaches,
  getDashboardContext,
  getTeams,
  getTrainingDetail,
  requireTrainingReadAccess,
} from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function TrainingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const { access } = await getDashboardContext();
  requireTrainingReadAccess(access);

  const data = await getTrainingDetail(id);
  if (!data) notFound();

  const canManage = canManageTrainings(access.roles);
  const showEdit = edit === "1" && canManage;

  if (showEdit) {
    const [teams, coaches] = await Promise.all([getTeams(), getCoaches()]);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Edycja treningu</h1>
            <p className="text-sm text-muted-foreground">{data.training.name}</p>
          </div>
          <Link
            href={`/training/${id}`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Anuluj
          </Link>
        </div>
        <TrainingForm
          teams={teams}
          coaches={coaches}
          training={data.training}
          mode="edit"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        {canManage ? (
          <Link
            href={`/training/${id}?edit=1`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            Edytuj trening
          </Link>
        ) : null}
      </div>
      <TrainingDetailView
        data={data}
        canManage={canManage}
        canMarkAttendance={canMarkTrainingAttendance(access.roles)}
        canSetAvailability={canSetTrainingAvailability(access.roles)}
      />
    </div>
  );
}
