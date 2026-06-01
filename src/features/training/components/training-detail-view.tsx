"use client";

import { useActionState, useState, useTransition } from "react";

import {
  addTrainingSessionNote,
  cancelTraining,
  completeTraining,
  setTrainingAttendance,
  type TrainingActionState,
} from "@/features/training/actions";
import { TrainingStatusBadge } from "@/features/training/components/training-status-badge";
import {
  ABSENCE_REASON_LABELS,
  ATTENDANCE_STATUS_LABELS,
  AVAILABILITY_STATUS_LABELS,
} from "@/lib/training/constants";
import type { TrainingDetailData } from "@/lib/auth/session";
import { setTrainingAvailabilityOfflineAware } from "@/lib/pwa/offline-actions";
import type { Player } from "@/types/players";
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

export function TrainingDetailView({
  data,
  canManage,
  canMarkAttendance,
  canSetAvailability,
}: {
  data: TrainingDetailData;
  canManage: boolean;
  canMarkAttendance: boolean;
  canSetAvailability: boolean;
}) {
  const { training, availability, attendance, notes, teamPlayers, myPlayerId } = data;
  const [pending, startTransition] = useTransition();
  const myAvailability = availability.find((row) => row.playerId === myPlayerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{training.name}</h1>
            <TrainingStatusBadge status={training.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {training.trainingDate} · {training.startTime}–{training.endTime}
          </p>
          <p className="text-sm text-muted-foreground">
            {training.teamName} · {training.coachName ?? "Brak trenera"} ·{" "}
            {training.location ?? "Brak lokalizacji"}
          </p>
          {training.description ? (
            <p className="mt-3 text-sm">{training.description}</p>
          ) : null}
        </div>

        {canManage && training.status === "planned" ? (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => startTransition(() => void completeTraining(training.id))}
            >
              Zakończ trening
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending}
              onClick={() => startTransition(() => void cancelTraining(training.id))}
            >
              Odwołaj
            </Button>
          </div>
        ) : null}
      </div>

      {canSetAvailability && myPlayerId && training.status === "planned" ? (
        <AvailabilityForm trainingId={training.id} current={myAvailability ?? null} />
      ) : null}

      {canMarkAttendance && training.status !== "cancelled" ? (
        <AttendancePanel
          trainingId={training.id}
          players={teamPlayers}
          attendance={attendance}
        />
      ) : null}

      {training.status === "planned" ? (
        <AvailabilitySummary availability={availability} />
      ) : null}

      {canManage ? (
        <SessionNotesPanel
          trainingId={training.id}
          notes={notes}
          players={teamPlayers}
        />
      ) : (
        <NotesList notes={notes} />
      )}
    </div>
  );
}

function AvailabilityForm({
  trainingId,
  current,
}: {
  trainingId: string;
  current: TrainingDetailData["availability"][number] | null;
}) {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<{ error?: string; success?: string }>({});

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFeedback({});

    const formData = new FormData(event.currentTarget);
    const result = await setTrainingAvailabilityOfflineAware(trainingId, {
      status: String(formData.get("status") ?? ""),
      absenceReason: String(formData.get("absenceReason") ?? "") || undefined,
      notes: String(formData.get("notes") ?? "") || undefined,
    });

    if (result.error) {
      setFeedback({ error: result.error });
    } else if (result.queued) {
      setFeedback({
        success: "Zapisano offline — synchronizacja po odzyskaniu sieci.",
      });
    } else {
      setFeedback({ success: "Zapisano dostępność." });
    }
    setPending(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Twoja dostępność</CardTitle>
        <CardDescription>Potwierdź obecność na treningu.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          {feedback.error ? (
            <p className="md:col-span-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {feedback.error}
            </p>
          ) : null}
          {feedback.success ? (
            <p className="md:col-span-2 rounded-md bg-primary/10 px-3 py-2 text-sm">
              {feedback.success}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              defaultValue={current?.status ?? "unknown"}
              className={selectClassName}
            >
              {Object.entries(AVAILABILITY_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="absenceReason">Powód nieobecności</Label>
            <select
              id="absenceReason"
              name="absenceReason"
              defaultValue={current?.absenceReason ?? ""}
              className={selectClassName}
            >
              <option value="">—</option>
              {Object.entries(ABSENCE_REASON_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="notes">Uwagi</Label>
            <Input id="notes" name="notes" defaultValue={current?.notes ?? ""} />
          </div>
          <Button type="submit" disabled={pending}>
            Zapisz dostępność
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AvailabilitySummary({
  availability,
}: {
  availability: TrainingDetailData["availability"];
}) {
  const present = availability.filter((row) => row.status === "present").length;
  const absent = availability.filter((row) => row.status === "absent").length;
  const unknown = availability.filter((row) => row.status === "unknown").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Potwierdzenia obecności</CardTitle>
        <CardDescription>
          Obecni: {present} · Nieobecni: {absent} · Nie wiem: {unknown}
        </CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2 pr-4">Zawodnik</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Powód</th>
            </tr>
          </thead>
          <tbody>
            {availability.map((row) => (
              <tr key={row.id} className="border-b last:border-0">
                <td className="py-2 pr-4">{row.playerName}</td>
                <td className="py-2 pr-4">{AVAILABILITY_STATUS_LABELS[row.status]}</td>
                <td className="py-2">
                  {row.absenceReason ? ABSENCE_REASON_LABELS[row.absenceReason] : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function AttendancePanel({
  trainingId,
  players,
  attendance,
}: {
  trainingId: string;
  players: Player[];
  attendance: TrainingDetailData["attendance"];
}) {
  const attendanceMap = new Map(attendance.map((row) => [row.playerId, row]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lista obecności</CardTitle>
        <CardDescription>Oznacz obecność po treningu.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {players.map((player) => (
          <AttendanceRow
            key={player.id}
            trainingId={trainingId}
            player={player}
            current={attendanceMap.get(player.id) ?? null}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function AttendanceRow({
  trainingId,
  player,
  current,
}: {
  trainingId: string;
  player: Player;
  current: TrainingDetailData["attendance"][number] | null;
}) {
  const action = setTrainingAttendance.bind(null, trainingId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border p-3 sm:grid sm:grid-cols-[1fr_10rem_10rem_auto] sm:items-end">
      <input type="hidden" name="playerId" value={player.id} />
      <div>
        <p className="font-medium">
          {player.firstName} {player.lastName}
        </p>
        {state.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-xs text-primary">{state.success}</p> : null}
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <select
          name="status"
          defaultValue={current?.status ?? "present"}
          className={selectClassName}
        >
          {Object.entries(ATTENDANCE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label>Notatka</Label>
        <Input name="notes" defaultValue={current?.notes ?? ""} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        Zapisz
      </Button>
    </form>
  );
}

function SessionNotesPanel({
  trainingId,
  notes,
  players,
}: {
  trainingId: string;
  notes: TrainingDetailData["notes"];
  players: Player[];
}) {
  const action = addTrainingSessionNote.bind(null, trainingId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notatki po treningu</CardTitle>
          <CardDescription>Opis, uwagi i obserwacje — opcjonalnie dla zawodnika.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.error ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
            {state.success ? (
              <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">{state.success}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="playerId">Zawodnik (opcjonalnie)</Label>
              <select id="playerId" name="playerId" className={selectClassName} defaultValue="">
                <option value="">Ogólna notatka</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.firstName} {player.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="content">Treść</Label>
              <textarea
                id="content"
                name="content"
                rows={4}
                required
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-xs"
              />
            </div>
            <Button type="submit" disabled={pending}>
              Dodaj notatkę
            </Button>
          </form>
        </CardContent>
      </Card>
      <NotesList notes={notes} />
    </div>
  );
}

function NotesList({ notes }: { notes: TrainingDetailData["notes"] }) {
  if (notes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Brak notatek dla tego treningu.</p>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((note) => (
        <div key={note.id} className="rounded-lg border p-4">
          <p className="text-sm">{note.content}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {note.authorName ?? "Trener"}
            {note.playerName ? ` · ${note.playerName}` : ""} ·{" "}
            {new Date(note.createdAt).toLocaleString("pl-PL")}
          </p>
        </div>
      ))}
    </div>
  );
}
