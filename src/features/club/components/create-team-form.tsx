"use client";

import { useActionState } from "react";

import { createTeam, type ClubActionState } from "@/features/club/actions";
import { TEAM_CATEGORIES } from "@/types/rbac";
import { TEAM_CATEGORY_LABELS } from "@/config/constants";
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

const categoryLabels = TEAM_CATEGORY_LABELS;

export function CreateTeamForm() {
  const [state, action, pending] = useActionState(createTeam, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nowa drużyna</CardTitle>
        <CardDescription>Dodaj drużynę do klubu.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {state.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive md:col-span-3">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm md:col-span-3">
              {state.success}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="name">Nazwa</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Kategoria</Label>
            <select
              id="category"
              name="category"
              className="flex h-8 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
              defaultValue="seniors"
            >
              {TEAM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {categoryLabels[category]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="season">Sezon</Label>
            <Input id="season" name="season" placeholder="2025/2026" />
          </div>
          <div className="md:col-span-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Tworzenie..." : "Dodaj drużynę"}
            </Button>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}
