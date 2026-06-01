"use client";

import { useTransition } from "react";

import { signOut } from "@/features/auth/actions";
import { clearAllPwaLocalData } from "@/lib/pwa/offline-store";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

function useSignOutAction() {
  const [pending, startTransition] = useTransition();

  function onSignOut() {
    startTransition(async () => {
      await clearAllPwaLocalData();
      await signOut();
    });
  }

  return { pending, onSignOut };
}

export function SignOutButton() {
  const { pending, onSignOut } = useSignOutAction();

  return (
    <Button
      type="button"
      variant="ghost"
      className="w-full justify-start px-2 font-normal"
      disabled={pending}
      onClick={onSignOut}
    >
      Wyloguj się
    </Button>
  );
}

export function SignOutMenuItem() {
  const { pending, onSignOut } = useSignOutAction();

  return (
    <DropdownMenuItem disabled={pending} onClick={onSignOut}>
      Wyloguj się
    </DropdownMenuItem>
  );
}
