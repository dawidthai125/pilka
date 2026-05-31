import { Badge } from "@/components/ui/badge";
import { MATCH_STATUS_LABELS } from "@/lib/matches/constants";
import type { MatchStatus } from "@/types/matches";
import { cn } from "@/lib/utils";

const tone: Record<MatchStatus, string> = {
  planned: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  in_progress: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  cancelled: "bg-destructive/10 text-destructive",
  postponed: "bg-muted text-muted-foreground",
};

export function MatchStatusBadge({ status, className }: { status: MatchStatus; className?: string }) {
  return (
    <Badge variant="secondary" className={cn(tone[status], className)}>
      {MATCH_STATUS_LABELS[status]}
    </Badge>
  );
}
