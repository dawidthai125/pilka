"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/config/permissions";
import { inviteMember, type MemberActionState } from "@/features/members/actions";
import { INVITABLE_CLUB_ROLES } from "@/lib/members/invite-roles";
import type { ClubRole } from "@/types/rbac";

const inputClass = "border-input min-h-[44px] w-full rounded-md border bg-background px-3 text-foreground";

export function InviteMemberForm({ assignableRoles }: { assignableRoles: ClubRole[] }) {
  const [state, action, pending] = useActionState(inviteMember, {} as MemberActionState);

  const roles = assignableRoles.filter((role) => INVITABLE_CLUB_ROLES.includes(role));

  return (
    <form action={action} className="space-y-4 rounded-lg border bg-card p-4">
      <div>
        <h3 className="font-semibold">Zaproś członka</h3>
        <p className="text-sm text-muted-foreground">
          Wyślij zaproszenie e-mailem. Rola właściciela nie jest dostępna.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="fullName"
          type="text"
          required
          placeholder="Imię i nazwisko"
          className={inputClass}
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className={inputClass}
        />
        <select name="role" required className={`${inputClass} sm:col-span-2`} defaultValue="">
          <option value="" disabled>
            Wybierz rolę
          </option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Wysyłanie…" : "Wyślij zaproszenie"}
      </Button>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
    </form>
  );
}
