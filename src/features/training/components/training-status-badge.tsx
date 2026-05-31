import { Badge } from "@/components/ui/badge";
import { TRAINING_STATUS_LABELS } from "@/lib/training/constants";
import type { TrainingStatus } from "@/types/trainings";
import { cn } from "@/lib/utils";

const tone: Record<TrainingStatus, string> = {
  planned: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
};

export function TrainingStatusBadge({
  status,
  className,
}: {
  status: TrainingStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn(tone[status], className)}>
      {TRAINING_STATUS_LABELS[status]}
    </Badge>
  );
}
