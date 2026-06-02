"use client";

import { useActionState } from "react";

import { signInWithPassword, type AuthActionState } from "@/features/auth/actions";
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

export function LoginForm() {
  const [state, action, pending] = useActionState(signInWithPassword, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Logowanie</CardTitle>
        <CardDescription>Wprowadź dane swojego konta klubowego.</CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="space-y-4">
          {state.error ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Logowanie..." : "Zaloguj się"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Nie masz konta? <AuthLink href="/register">Zarejestruj się</AuthLink>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            <AuthLink href="/forgot-password">Przypomnij hasło</AuthLink>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
