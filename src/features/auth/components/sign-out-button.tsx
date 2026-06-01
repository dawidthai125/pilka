"use client";

import { useTransition } from "react";

import { signOut } from "@/features/auth/actions";
import { clearAllPwaLocalData } from "@/lib/pwa/offline-store";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start px-2 font-normal"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          await clearAllPwaLocalData();
          await signOut();
        });
      }}
    >
      Wyloguj się
    </Button>
  );
}
