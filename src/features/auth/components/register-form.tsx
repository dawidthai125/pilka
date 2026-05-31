"use client";

import { useActionState } from "react";

import { signUpWithPassword, type AuthActionState } from "@/features/auth/actions";
import { AuthLink } from "@/components/auth/auth-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const initialState: AuthActionState = {};

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUpWithPassword, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rejestracja</CardTitle>
        <CardDescription>Utwórz konto w systemie klubu.</CardDescription>
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
            <Label htmlFor="fullName">Imię i nazwisko</Label>
            <Input id="fullName" name="fullName" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input id="password" name="password" type="password" minLength={8} required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Tworzenie konta..." : "Zarejestruj się"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Masz konto? <AuthLink href="/login">Zaloguj się</AuthLink>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
