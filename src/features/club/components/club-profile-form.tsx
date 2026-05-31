"use client";

import { useActionState } from "react";

import { updateClubProfile, type ClubActionState } from "@/features/club/actions";
import { canManageClub } from "@/config/permissions";
import type { Club, ClubRole } from "@/types/rbac";
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

const initialState: ClubActionState = {};

export function ClubProfileForm({
  club,
  roles,
}: {
  club: Club;
  roles: ClubRole[];
}) {
  const [state, action, pending] = useActionState(updateClubProfile, initialState);
  const canEdit = canManageClub(roles);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil klubu</CardTitle>
        <CardDescription>
          {canEdit
            ? "Edytuj dane klubu widoczne w systemie."
            : "Podgląd danych klubu (brak uprawnień do edycji)."}
        </CardDescription>
      </CardHeader>
      <form action={canEdit ? action : undefined}>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {state.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-2">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm md:col-span-2">
              {state.success}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="publicName">Nazwa publiczna</Label>
            <Input
              id="publicName"
              name="publicName"
              defaultValue={club.publicName}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officialName">Nazwa licencyjna</Label>
            <Input
              id="officialName"
              name="officialName"
              defaultValue={club.officialName ?? ""}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="association">Związek</Label>
            <Input
              id="association"
              name="association"
              defaultValue={club.association ?? ""}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="competitionLevel">Poziom rozgrywkowy</Label>
            <Input
              id="competitionLevel"
              name="competitionLevel"
              defaultValue={club.competitionLevel ?? ""}
              disabled={!canEdit}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="voivodeship">Województwo</Label>
            <Input
              id="voivodeship"
              name="voivodeship"
              defaultValue={club.voivodeship ?? ""}
              disabled={!canEdit}
            />
          </div>
          {canEdit ? (
            <div className="md:col-span-2">
              <Button type="submit" disabled={pending}>
                {pending ? "Zapisywanie..." : "Zapisz profil klubu"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </form>
    </Card>
  );
}
