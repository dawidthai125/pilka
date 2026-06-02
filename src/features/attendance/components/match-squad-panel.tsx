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
import { RETURN_TO_MATCH_STATUS_LABELS } from "@/types/injuries";
import { Badge } from "@/components/ui/badge";

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

  if (!rows.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Brak powołań na ten mecz. Trener może dodać skład w module Mecze.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <Card key={row.playerId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{row.playerName}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {MATCH_CALL_STATUS_LABELS[row.callStatus]} · {row.squadRole}
            </p>
            {row.injuryMatchStatus ? (
              <Badge variant="outline" className="mt-1">
                RTP mecz:{" "}
                {RETURN_TO_MATCH_STATUS_LABELS[
                  row.injuryMatchStatus as keyof typeof RETURN_TO_MATCH_STATUS_LABELS
                ] ?? row.injuryMatchStatus}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {canManage ? (
              (["called_up", "reserve", "not_called_up"] as const).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  className="min-h-11"
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
