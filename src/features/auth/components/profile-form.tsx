"use client";

import { useActionState } from "react";

import { updateProfile, type AuthActionState } from "@/features/auth/actions";
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
import type { Profile } from "@/types/rbac";

const initialState: AuthActionState = {};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfile, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profil użytkownika</CardTitle>
        <CardDescription>Edytuj swoje dane kontaktowe.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          {state.success ? (
            <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">{state.success}</p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={profile.email} disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fullName">Imię i nazwisko</Label>
            <Input
              id="fullName"
              name="fullName"
              defaultValue={profile.fullName ?? ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" defaultValue={profile.phone ?? ""} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Zapisywanie..." : "Zapisz profil"}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
}
