"use client";

import { signOut } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" className="w-full justify-start px-2 font-normal">
        Wyloguj się
      </Button>
    </form>
  );
}
