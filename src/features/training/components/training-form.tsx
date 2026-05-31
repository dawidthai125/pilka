"use client";

import { useActionState } from "react";

import {
  createTraining,
  updateTraining,
  type TrainingActionState,
} from "@/features/training/actions";
import { TRAINING_STATUS_LABELS } from "@/lib/training/constants";
import type { Training } from "@/types/trainings";
import type { Team } from "@/types/rbac";
import type { ClubMemberRow } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: TrainingActionState = {};
const selectClassName =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function TrainingForm({
  teams,
  coaches,
  training,
  mode,
}: {
  teams: Team[];
  coaches: ClubMemberRow[];
  training?: Training;
  mode: "create" | "edit";
}) {
  const action = mode === "create" ? createTraining : updateTraining.bind(null, training!.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <div className="space-y-6">
        {state.error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.success ? (
          <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">{state.success}</p>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Plan treningu</CardTitle>
            <CardDescription>Harmonogram, lokalizacja i prowadzący trener.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Nazwa treningu</Label>
              <Input id="name" name="name" defaultValue={training?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="teamId">Drużyna</Label>
              <select
                id="teamId"
                name="teamId"
                defaultValue={training?.teamId}
                className={selectClassName}
                required
              >
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coachUserId">Trener prowadzący</Label>
              <select
                id="coachUserId"
                name="coachUserId"
                defaultValue={training?.coachUserId ?? ""}
                className={selectClassName}
              >
                <option value="">—</option>
                {coaches.map((coach) => (
                  <option key={coach.user_id} value={coach.user_id}>
                    {coach.profile?.full_name ?? coach.profile?.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainingDate">Data</Label>
              <Input
                id="trainingDate"
                name="trainingDate"
                type="date"
                defaultValue={training?.trainingDate}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={training?.status ?? "planned"}
                className={selectClassName}
              >
                {Object.entries(TRAINING_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Godzina rozpoczęcia</Label>
              <Input
                id="startTime"
                name="startTime"
                type="time"
                defaultValue={training?.startTime}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Godzina zakończenia</Label>
              <Input
                id="endTime"
                name="endTime"
                type="time"
                defaultValue={training?.endTime}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Lokalizacja</Label>
              <Input id="location" name="location" defaultValue={training?.location ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Opis</Label>
              <textarea
                id="description"
                name="description"
                defaultValue={training?.description ?? ""}
                rows={4}
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-xs"
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie..." : mode === "create" ? "Utwórz trening" : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
  );
}
