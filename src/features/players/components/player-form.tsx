"use client";

import { useActionState } from "react";

import {
  createPlayer,
  updatePlayer,
  type PlayerActionState,
} from "@/features/players/actions";
import {
  DOMINANT_FOOT_LABELS,
  PLAYER_POSITION_LABELS,
  PLAYER_STATUS_LABELS,
} from "@/lib/players/constants";
import type { Player } from "@/types/players";
import type { Team } from "@/types/rbac";
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

const initialState: PlayerActionState = {};

const selectClassName =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function PlayerForm({
  teams,
  player,
  mode,
}: {
  teams: Team[];
  player?: Player;
  mode: "create" | "edit";
}) {
  const action = mode === "create" ? createPlayer : updatePlayer.bind(null, player!.id);
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
            <CardTitle>Dane podstawowe</CardTitle>
            <CardDescription>Informacje kontaktowe i adresowe zawodnika.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Imię</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={player?.firstName}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nazwisko</Label>
              <Input id="lastName" name="lastName" defaultValue={player?.lastName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Data urodzenia</Label>
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                type="date"
                defaultValue={player?.dateOfBirth}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" defaultValue={player?.phone ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={player?.email ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Adres zamieszkania</Label>
              <Input id="address" name="address" defaultValue={player?.address ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">Miejscowość</Label>
              <Input id="city" name="city" defaultValue={player?.city ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Kod pocztowy</Label>
              <Input id="postalCode" name="postalCode" defaultValue={player?.postalCode ?? ""} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dane piłkarskie</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teamId">Drużyna</Label>
              <select
                id="teamId"
                name="teamId"
                defaultValue={player?.teamId ?? ""}
                className={selectClassName}
              >
                <option value="">— Brak —</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="jerseyNumber">Numer na koszulce</Label>
              <Input
                id="jerseyNumber"
                name="jerseyNumber"
                type="number"
                min={1}
                max={99}
                defaultValue={player?.jerseyNumber ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryPosition">Pozycja główna</Label>
              <select
                id="primaryPosition"
                name="primaryPosition"
                defaultValue={player?.primaryPosition ?? ""}
                className={selectClassName}
              >
                <option value="">—</option>
                {Object.entries(PLAYER_POSITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="secondaryPosition">Pozycja dodatkowa</Label>
              <select
                id="secondaryPosition"
                name="secondaryPosition"
                defaultValue={player?.secondaryPosition ?? ""}
                className={selectClassName}
              >
                <option value="">—</option>
                {Object.entries(PLAYER_POSITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dominantFoot">Dominująca noga</Label>
              <select
                id="dominantFoot"
                name="dominantFoot"
                defaultValue={player?.dominantFoot ?? ""}
                className={selectClassName}
              >
                <option value="">—</option>
                {Object.entries(DOMINANT_FOOT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="heightCm">Wzrost (cm)</Label>
              <Input
                id="heightCm"
                name="heightCm"
                type="number"
                defaultValue={player?.heightCm ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weightKg">Waga (kg)</Label>
              <Input
                id="weightKg"
                name="weightKg"
                type="number"
                step="0.1"
                defaultValue={player?.weightKg ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status i przynależność</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                defaultValue={player?.status ?? "active"}
                className={selectClassName}
              >
                {Object.entries(PLAYER_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="joinedAt">Data dołączenia</Label>
              <Input
                id="joinedAt"
                name="joinedAt"
                type="date"
                defaultValue={player?.joinedAt ?? ""}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="leftAt">Data odejścia</Label>
              <Input
                id="leftAt"
                name="leftAt"
                type="date"
                defaultValue={player?.leftAt ?? ""}
              />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={pending}>
          {pending
            ? "Zapisywanie..."
            : mode === "create"
              ? "Dodaj zawodnika"
              : "Zapisz zmiany"}
        </Button>
      </div>
    </form>
  );
}
