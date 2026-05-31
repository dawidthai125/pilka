import type { SponsorCooperationStatus } from "@/types/sponsors";
import { SPONSOR_COOPERATION_STATUS_LABELS } from "@/lib/sponsors/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const tone: Record<SponsorCooperationStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  expiring: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
  ended: "bg-muted text-muted-foreground",
  potential: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
};

export function SponsorStatusBadge({
  status,
  className,
}: {
  status: SponsorCooperationStatus;
  className?: string;
}) {
  return (
    <Badge variant="secondary" className={cn("font-normal", tone[status], className)}>
      {SPONSOR_COOPERATION_STATUS_LABELS[status]}
    </Badge>
  );
}
