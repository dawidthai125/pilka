"use client";

import { useActionState } from "react";

import { requestPasswordReset, type AuthActionState } from "@/features/auth/actions";
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

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reset hasła</CardTitle>
        <CardDescription>Wyślemy link do ustawienia nowego hasła.</CardDescription>
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
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Wysyłanie..." : "Wyślij link resetujący"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <AuthLink href="/login">Wróć do logowania</AuthLink>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
