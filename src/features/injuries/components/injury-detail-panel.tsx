"use client";

import { useActionState } from "react";

import {
  updateInjuryAction,
  updateRehabilitationAction,
  updateReturnToPlayAction,
  type InjuryActionState,
} from "@/features/injuries/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  INJURY_AVAILABILITY_IMPACTS,
  INJURY_AVAILABILITY_IMPACT_LABELS,
  INJURY_RECORD_STATUSES,
  INJURY_RECORD_STATUS_LABELS,
  REHABILITATION_PLAN_STATUSES,
  REHABILITATION_PLAN_STATUS_LABELS,
  RETURN_TO_MATCH_STATUSES,
  RETURN_TO_MATCH_STATUS_LABELS,
  RETURN_TO_TRAINING_STATUSES,
  RETURN_TO_TRAINING_STATUS_LABELS,
  type PlayerInjuryRow,
  type RehabilitationPlanRow,
  type ReturnToPlayRow,
} from "@/types/injuries";

export function InjuryDetailPanel({
  injury,
  rehabilitation,
  returnToPlay,
  canManage,
}: {
  injury: PlayerInjuryRow;
  rehabilitation: RehabilitationPlanRow | null;
  returnToPlay: ReturnToPlayRow | null;
  canManage: boolean;
}) {
  const [injuryState, injuryAction, injuryPending] = useActionState<
    InjuryActionState,
    FormData
  >(updateInjuryAction, {});
  const [rehabState, rehabAction, rehabPending] = useActionState<
    InjuryActionState,
    FormData
  >(updateRehabilitationAction, {});
  const [rtpState, rtpAction, rtpPending] = useActionState<InjuryActionState, FormData>(
    updateReturnToPlayAction,
    {},
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {injury.playerName} — {INJURY_RECORD_STATUS_LABELS[injury.injuryStatus]}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {injury.categoryName ?? "Bez kategorii"} · {injury.teamName ?? "—"}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-sm">{injury.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Zgłoszenie: {injury.injuryDate}
            {injury.expectedReturnDate ? ` · Powrót: ${injury.expectedReturnDate}` : ""}
          </p>
        </CardContent>
      </Card>

      {canManage ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status urazu</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={injuryAction} className="space-y-3">
                <input type="hidden" name="injuryId" value={injury.id} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="injuryStatus">Status</Label>
                    <select
                      id="injuryStatus"
                      name="injuryStatus"
                      defaultValue={injury.injuryStatus}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {INJURY_RECORD_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {INJURY_RECORD_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="availabilityImpact">Dostępność</Label>
                    <select
                      id="availabilityImpact"
                      name="availabilityImpact"
                      defaultValue={injury.availabilityImpact ?? "unavailable"}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {INJURY_AVAILABILITY_IMPACTS.map((s) => (
                        <option key={s} value={s}>
                          {INJURY_AVAILABILITY_IMPACT_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedReturnDate">Przewidywany powrót</Label>
                  <Input
                    id="expectedReturnDate"
                    name="expectedReturnDate"
                    type="date"
                    defaultValue={injury.expectedReturnDate ?? ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Opis</Label>
                  <textarea
                    id="description"
                    name="description"
                    defaultValue={injury.description}
                    rows={3}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                {injuryState.error ? (
                  <p className="text-sm text-destructive">{injuryState.error}</p>
                ) : null}
                {injuryState.success ? (
                  <p className="text-sm text-green-600">{injuryState.success}</p>
                ) : null}
                <Button type="submit" size="sm" disabled={injuryPending}>
                  Zapisz status
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Plan rehabilitacji</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={rehabAction} className="space-y-3">
                <input type="hidden" name="injuryId" value={injury.id} />
                <input type="hidden" name="playerId" value={injury.playerId} />
                <div className="space-y-2">
                  <Label htmlFor="stageLabel">Etap rehabilitacji</Label>
                  <Input
                    id="stageLabel"
                    name="stageLabel"
                    defaultValue={rehabilitation?.stageLabel ?? "Etap I"}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coachNote">Notatka trenera</Label>
                  <textarea
                    id="coachNote"
                    name="coachNote"
                    defaultValue={rehabilitation?.coachNote ?? ""}
                    rows={2}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="progressNote">Postęp</Label>
                  <textarea
                    id="progressNote"
                    name="progressNote"
                    defaultValue={rehabilitation?.progressNote ?? ""}
                    rows={2}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rehabStatus">Status</Label>
                  <select
                    id="rehabStatus"
                    name="status"
                    defaultValue={rehabilitation?.status ?? "in_progress"}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {REHABILITATION_PLAN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {REHABILITATION_PLAN_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
                {rehabState.error ? (
                  <p className="text-sm text-destructive">{rehabState.error}</p>
                ) : null}
                {rehabState.success ? (
                  <p className="text-sm text-green-600">{rehabState.success}</p>
                ) : null}
                <Button type="submit" size="sm" disabled={rehabPending}>
                  Aktualizuj rehabilitację
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Powrót do gry</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={rtpAction} className="space-y-3">
                <input type="hidden" name="injuryId" value={injury.id} />
                <input type="hidden" name="playerId" value={injury.playerId} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="trainingStatus">Powrót do treningów</Label>
                    <select
                      id="trainingStatus"
                      name="trainingStatus"
                      defaultValue={returnToPlay?.trainingStatus ?? "no_clearance"}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {RETURN_TO_TRAINING_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {RETURN_TO_TRAINING_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="matchStatus">Powrót do meczów</Label>
                    <select
                      id="matchStatus"
                      name="matchStatus"
                      defaultValue={returnToPlay?.matchStatus ?? "unavailable"}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {RETURN_TO_MATCH_STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {RETURN_TO_MATCH_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notatki</Label>
                  <textarea
                    id="notes"
                    name="notes"
                    defaultValue={returnToPlay?.notes ?? ""}
                    rows={2}
                    className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                {rtpState.error ? <p className="text-sm text-destructive">{rtpState.error}</p> : null}
                {rtpState.success ? (
                  <p className="text-sm text-green-600">{rtpState.success}</p>
                ) : null}
                <Button type="submit" size="sm" disabled={rtpPending}>
                  Zapisz powrót
                </Button>
              </form>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
