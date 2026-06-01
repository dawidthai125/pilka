"use client";

import { useTransition } from "react";

import { quickAbsentAction, quickAvailableAction } from "@/features/attendance/actions";
import { Button } from "@/components/ui/button";

export function AttendanceQuickActions({
  trainingId,
  playerId,
}: {
  trainingId: string;
  playerId?: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap gap-2 md:hidden">
      <Button
        size="sm"
        disabled={pending}
        className="min-h-11 flex-1"
        onClick={() => startTransition(() => void quickAvailableAction(trainingId, playerId))}
      >
        Dostępny
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={pending}
        className="min-h-11 flex-1"
        onClick={() => startTransition(() => void quickAbsentAction(trainingId, playerId))}
      >
        Nie będzie mnie
      </Button>
    </div>
  );
}
