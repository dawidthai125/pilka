"use client";

import { useTransition } from "react";

import {
  respondMatchSquadAction,
  setMatchCallStatusAction,
} from "@/features/attendance/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MATCH_CALL_STATUS_LABELS,
  SQUAD_CONFIRMATION_LABELS,
  type MatchSquadCallRow,
} from "@/types/attendance";

export function MatchSquadPanel({
  matchId,
  rows,
  canManage,
  managedPlayerIds,
}: {
  matchId: string;
  rows: MatchSquadCallRow[];
  canManage: boolean;
  managedPlayerIds: string[];
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.playerId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{row.playerName}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {MATCH_CALL_STATUS_LABELS[row.callStatus]} · {row.squadRole}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canManage ? (
              (["called_up", "reserve", "not_called_up"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={row.callStatus === status ? "default" : "outline"}
                  onClick={() =>
                    startTransition(() => void setMatchCallStatusAction(matchId, row.playerId, status))
                  }
                >
                  {MATCH_CALL_STATUS_LABELS[status]}
                </Button>
              ))
            ) : managedPlayerIds.includes(row.playerId) &&
              (row.callStatus === "called_up" || row.callStatus === "reserve") ? (
              (["yes", "no", "unknown"] as const).map((response) => (
                <Button
                  key={response}
                  size="sm"
                  variant={row.userResponse === response ? "default" : "outline"}
                  onClick={() =>
                    startTransition(() =>
                      void respondMatchSquadAction(matchId, row.playerId, response),
                    )
                  }
                >
                  {SQUAD_CONFIRMATION_LABELS[response]}
                </Button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Brak akcji</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
