"use client";

import { useActionState } from "react";

import { signInWithPassword, type AuthActionState } from "@/features/auth/actions";
import { AuthLink } from "@/components/auth/auth-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = {};

export function LoginForm() {
  const [state, action, pending] = useActionState(signInWithPassword, initialState);

  return (
    <form action={action} className="space-y-5">
      {state.error ? (
        <p className="rounded-lg bg-destructive/15 px-3 py-2 text-sm text-destructive">{state.error}</p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email" className="text-white/90">
          Email
        </Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="border-white/20 bg-white text-foreground"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password" className="text-white/90">
          Hasło
        </Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="border-white/20 bg-white text-foreground"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-white/70">
          <input type="checkbox" name="remember" className="rounded border-white/30" />
          Zapamiętaj mnie
        </label>
        <AuthLink href="/forgot-password">
          <span className="text-[var(--club-secondary)] hover:underline">Nie pamiętasz hasła?</span>
        </AuthLink>
      </div>

      <Button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-lg bg-[var(--club-secondary)] text-sm font-bold uppercase tracking-wide text-[var(--club-primary)] hover:brightness-105"
      >
        {pending ? "Logowanie..." : "Zaloguj się"}
      </Button>

      <p className="text-center text-sm text-white/60">
        Nie masz konta?{" "}
        <AuthLink href="/register">
          <span className="font-semibold text-[var(--club-secondary)] hover:underline">Zarejestruj się</span>
        </AuthLink>
      </p>
    </form>
  );
}
