import { getSiteUrl } from "@/config/env";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ClubRole } from "@/types/rbac";

import { isInvitableClubRole } from "./invite-roles";

export type InviteMemberInput = {
  clubId: string;
  email: string;
  fullName: string;
  role: ClubRole;
};

export type InviteMemberResult = {
  userId: string;
  email: string;
  created: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
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

    const { error: membershipError } = await admin.from("club_memberships").upsert(
      {
        club_id: input.clubId,
        user_id: userId,
        role: input.role,
        status: "invited",
      },
      { onConflict: "club_id,user_id,role" },
    );

    if (membershipError) throw new Error(membershipError.message);

    return { userId, email: normalized, created: false };
  }

  const { data, error } = await admin.auth.admin.inviteUserByEmail(normalized, {
    data: { full_name: fullName },
    redirectTo: `${getSiteUrl()}/auth/callback`,
  });

  if (error || !data.user) {
    throw new Error(
      `Zaproszenie nie powiodło się: ${error?.message ?? "unknown"}. ` +
        "Jeśli użytkownik ma już konto, użyj innego adresu lub skontaktuj się z administratorem.",
    );
  }

  const { error: membershipError } = await admin.from("club_memberships").upsert(
    {
      club_id: input.clubId,
      user_id: data.user.id,
      role: input.role,
      status: "invited",
    },
    { onConflict: "club_id,user_id,role" },
  );

  if (membershipError) throw new Error(membershipError.message);

  return { userId: data.user.id, email: normalized, created: true };
}

export async function resendClubInvite(input: {
  clubId: string;
  membershipId: string;
  fullName?: string | null;
}): Promise<{ email: string }> {
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

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: input.fullName ?? profile?.full_name ?? "Członek klubu" },
    redirectTo: `${getSiteUrl()}/auth/callback`,
  });

  if (inviteError) {
    throw new Error(
      `Nie udało się ponowić zaproszenia: ${inviteError.message}. ` +
        "Supabase Auth może blokować ponowne zaproszenie — użytkownik może użyć pierwotnego linku lub reset hasła.",
    );
  }

  await admin
    .from("club_memberships")
    .update({ status: "invited", updated_at: new Date().toISOString() })
    .eq("id", input.membershipId);

  return { email };
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
    .update({ status: "archived" })
    .eq("id", input.membershipId)
    .eq("club_id", input.clubId);

  if (error) throw new Error(error.message);
}
