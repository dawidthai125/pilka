import { getSiteUrl } from "@/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClubRole } from "@/types/rbac";

import {
  type InviteDelivery,
  inviteUserByEmailWithGuard,
  isAuthUserConfirmed,
} from "./auth-invite-guard";
import { isInvitableClubRole } from "./invite-roles";

export type { InviteDelivery } from "./auth-invite-guard";

export type InviteMemberInput = {
  clubId: string;
  email: string;
  fullName: string;
  role: ClubRole;
};

export type InviteMemberResult = {
  userId: string;
  email: string;
  /** @deprecated use delivery — true when Supabase Auth invite email was sent */
  created: boolean;
  delivery: InviteDelivery;
};

export type ResendInviteResult = {
  email: string;
  delivery: InviteDelivery;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const EXISTING_USER_SUCCESS_HINT =
  "Użytkownik ma już konto w systemie — nie wysłano e-maila. " +
  "Po zalogowaniu status zmieni się automatycznie na aktywny. " +
  "Zaproszenie jest widoczne w zakładce Zaproszenia (Oczekujące).";

export function existingUserInviteMessage(email: string): string {
  return (
    `Dodano zaproszenie dla istniejącego użytkownika ${email}. ${EXISTING_USER_SUCCESS_HINT}`
  );
}

export function newUserInviteMessage(email: string): string {
  return `Zaproszenie e-mailem wysłane na ${email}. Użytkownik pojawi się w zakładce Zaproszenia jako Oczekujące.`;
}

export async function inviteClubMember(input: InviteMemberInput): Promise<InviteMemberResult> {
  if (!isInvitableClubRole(input.role)) {
    throw new Error("Nie można zaprosić użytkownika w tej roli.");
  }

  const admin = createAdminClient();
  const normalized = normalizeEmail(input.email);
  const fullName = input.fullName.trim();

  if (!normalized || !fullName) {
    throw new Error("Email i imię są wymagane.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, email")
    .ilike("email", normalized)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  if (profile?.id) {
    const userId = String(profile.id);

    const { data: existing, error: existingError } = await admin
      .from("club_memberships")
      .select("id, status, role")
      .eq("club_id", input.clubId)
      .eq("user_id", userId)
      .eq("role", input.role)
      .maybeSingle();

    if (existingError) throw new Error(existingError.message);

    if (existing?.status === "active") {
      throw new Error("Użytkownik ma już aktywne członkostwo w tej roli.");
    }
    if (existing?.status === "invited") {
      throw new Error("Zaproszenie dla tego użytkownika jest już w toku.");
    }
    if (existing?.status === "suspended") {
      throw new Error("Użytkownik jest zawieszony — przywróć członkostwo przed zaproszeniem.");
    }

    const now = new Date().toISOString();
    const { error: membershipError } = await admin.from("club_memberships").upsert(
      {
        club_id: input.clubId,
        user_id: userId,
        role: input.role,
        status: "invited",
        updated_at: now,
      },
      { onConflict: "club_id,user_id,role" },
    );

    if (membershipError) throw new Error(membershipError.message);

    return { userId, email: normalized, created: false, delivery: "login_required" };
  }

  const { userId } = await inviteUserByEmailWithGuard(admin, input.clubId, normalized, {
    data: { full_name: fullName },
    redirectTo: `${getSiteUrl()}/auth/callback`,
  });

  const { error: membershipError } = await admin.from("club_memberships").upsert(
    {
      club_id: input.clubId,
      user_id: userId,
      role: input.role,
      status: "invited",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "club_id,user_id,role" },
  );

  if (membershipError) throw new Error(membershipError.message);

  return { userId, email: normalized, created: true, delivery: "email" };
}

export async function resendClubInvite(input: {
  clubId: string;
  membershipId: string;
  fullName?: string | null;
}): Promise<ResendInviteResult> {
  const admin = createAdminClient();

  const { data: membership, error: membershipError } = await admin
    .from("club_memberships")
    .select("id, user_id, role, status, created_at, updated_at")
    .eq("id", input.membershipId)
    .eq("club_id", input.clubId)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error("Nie znaleziono zaproszenia.");
  if (membership.role === "owner") throw new Error("Nie można ponowić zaproszenia właściciela.");
  if (membership.status !== "invited") {
    throw new Error("Można ponowić tylko oczekujące lub wygasłe zaproszenia.");
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("email, full_name")
    .eq("id", membership.user_id)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);
  const email = profile?.email?.trim();
  if (!email) throw new Error("Brak adresu e-mail w profilu.");

  const { data: authData, error: authError } = await admin.auth.admin.getUserById(membership.user_id);

  if (authError) throw new Error(authError.message);

  const authUser = authData.user;
  const now = new Date().toISOString();

  if (authUser && isAuthUserConfirmed(authUser)) {
    await admin
      .from("club_memberships")
      .update({ status: "invited", updated_at: now })
      .eq("id", input.membershipId);

    return { email, delivery: "login_required" };
  }

  await inviteUserByEmailWithGuard(admin, input.clubId, email, {
    data: { full_name: input.fullName ?? profile?.full_name ?? "Członek klubu" },
    redirectTo: `${getSiteUrl()}/auth/callback`,
  });

  await admin
    .from("club_memberships")
    .update({ status: "invited", updated_at: now })
    .eq("id", input.membershipId);

  return { email, delivery: "email" };
}

export async function revokeClubInvite(input: {
  clubId: string;
  membershipId: string;
}): Promise<void> {
  const admin = createAdminClient();

  const { data: membership, error: membershipError } = await admin
    .from("club_memberships")
    .select("id, role, status")
    .eq("id", input.membershipId)
    .eq("club_id", input.clubId)
    .maybeSingle();

  if (membershipError) throw new Error(membershipError.message);
  if (!membership) throw new Error("Nie znaleziono zaproszenia.");
  if (membership.role === "owner") throw new Error("Nie można anulować zaproszenia właściciela.");
  if (membership.status !== "invited") {
    throw new Error("Można anulować tylko oczekujące lub wygasłe zaproszenia.");
  }

  const { error } = await admin
    .from("club_memberships")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", input.membershipId)
    .eq("club_id", input.clubId);

  if (error) throw new Error(error.message);
}
