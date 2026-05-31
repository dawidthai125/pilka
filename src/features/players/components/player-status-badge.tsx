import type { PlayerStatus } from "@/types/players";
import { PLAYER_STATUS_LABELS } from "@/lib/players/constants";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusVariant: Record<
  PlayerStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  injured: "destructive",
  suspended: "secondary",
  inactive: "outline",
};

export function PlayerStatusBadge({
  status,
  className,
}: {
  status: PlayerStatus;
  className?: string;
}) {
  return (
    <Badge variant={statusVariant[status]} className={cn(className)}>
      {PLAYER_STATUS_LABELS[status]}
    </Badge>
  );
}
