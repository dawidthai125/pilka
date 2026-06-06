"use server";

import { revalidatePath } from "next/cache";

import { canManageMembers } from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import {
  canAssignClubRole,
  canInviteClubRole,
  canInviteMembers,
  canManageMemberTarget,
} from "@/lib/members/guards";
import {
  deriveInvitationStatus,
  canResendInvitation,
  canRevokeInvitation,
} from "@/lib/members/invitation-utils";
import { AuthInviteRateLimitError } from "@/lib/members/auth-invite-guard";
import {
  existingUserInviteMessage,
  inviteClubMember,
  newUserInviteMessage,
  resendClubInvite,
  revokeClubInvite,
} from "@/lib/members/invite-service";
import type {
  BulkMemberActionState,
  MemberActionState,
} from "@/lib/members/bulk-member-types";
import {
  loadMembership,
  parseMembershipIdsFromFormData,
  parseTargetRole,
  reactivateMembershipById,
  runBulkMemberStatusMutation,
  suspendMembershipById,
} from "@/lib/members/member-mutation";
import { createClient } from "@/lib/supabase/server";
import { parseClubRole } from "@/lib/validators";
import type { ClubRole } from "@/types/rbac";

function requireMemberManage(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canManageMembers(access.roles)) {
    return { error: "Brak uprawnień do zarządzania członkami." };
  }
  return null;
}

function requireMemberInvite(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canInviteMembers(access.roles)) {
    return { error: "Brak uprawnień do zapraszania członków." };
  }
  return null;
}

export async function changeMemberRole(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberManage(access);
  if (denied) return denied;

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  const parsedRole = parseClubRole(roleRaw);

  if (!membershipId || !parsedRole.success) {
    return { error: "Nieprawidłowe dane członkostwa lub roli." };
  }

  const membership = await loadMembership(membershipId, access.clubId);
  if (!membership) {
    return { error: "Nie znaleziono członkostwa." };
  }

  const currentRole = parseTargetRole(membership.role);
  if (!currentRole) {
    return { error: "Nieprawidłowa rola członka." };
  }

  if (!canManageMemberTarget(access.roles, currentRole)) {
    return { error: "Nie możesz zarządzać tym członkiem." };
  }

  if (!canAssignClubRole(access.roles, parsedRole.data)) {
    return { error: "Nie możesz przypisać tej roli." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_memberships")
    .update({ role: parsedRole.data })
    .eq("id", membershipId)
    .eq("club_id", access.clubId);

  if (error) {
    return { error: "Nie udało się zmienić roli członka." };
  }

  revalidatePath("/members");
  return { success: "Rola członka została zaktualizowana." };
}

export async function suspendMember(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberManage(access);
  if (denied) return denied;

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) {
    return { error: "Nieprawidłowe dane członkostwa." };
  }

  const result = await suspendMembershipById(access.roles, access.clubId, membershipId);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/members");
  return { success: "Członek został zawieszony." };
}

export async function reactivateMember(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberManage(access);
  if (denied) return denied;

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) {
    return { error: "Nieprawidłowe dane członkostwa." };
  }

  const result = await reactivateMembershipById(access.roles, access.clubId, membershipId);
  if (!result.ok) {
    return { error: result.error };
  }

  revalidatePath("/members");
  return { success: "Członek został przywrócony." };
}

export async function bulkSuspendMembers(
  _prev: BulkMemberActionState,
  formData: FormData,
): Promise<BulkMemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberManage(access);
  if (denied) return denied;

  const membershipIds = parseMembershipIdsFromFormData(formData);
  const result = await runBulkMemberStatusMutation(
    "suspend",
    access.roles,
    access.clubId,
    membershipIds,
  );

  if (result.succeeded > 0) {
    revalidatePath("/members");
  }

  return { result };
}

export async function bulkReactivateMembers(
  _prev: BulkMemberActionState,
  formData: FormData,
): Promise<BulkMemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberManage(access);
  if (denied) return denied;

  const membershipIds = parseMembershipIdsFromFormData(formData);
  const result = await runBulkMemberStatusMutation(
    "reactivate",
    access.roles,
    access.clubId,
    membershipIds,
  );

  if (result.succeeded > 0) {
    revalidatePath("/members");
  }

  return { result };
}

export async function removeMember(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberManage(access);
  if (denied) return denied;

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) {
    return { error: "Nieprawidłowe dane członkostwa." };
  }

  const membership = await loadMembership(membershipId, access.clubId);
  if (!membership) {
    return { error: "Nie znaleziono członkostwa." };
  }

  const currentRole = parseTargetRole(membership.role);
  if (!currentRole) {
    return { error: "Nieprawidłowa rola członka." };
  }

  if (!canManageMemberTarget(access.roles, currentRole)) {
    return { error: "Nie możesz zarządzać tym członkiem." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_memberships")
    .delete()
    .eq("id", membershipId)
    .eq("club_id", access.clubId);

  if (error) {
    return { error: "Nie udało się usunąć członka z klubu." };
  }

  revalidatePath("/members");
  return { success: "Członek został usunięty z klubu." };
}

export async function inviteMember(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberInvite(access);
  if (denied) return denied;

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "").trim();
  const parsedRole = parseClubRole(roleRaw);

  if (!fullName || !email || !parsedRole.success) {
    return { error: "Podaj imię, email i rolę." };
  }

  if (!canInviteClubRole(access.roles, parsedRole.data)) {
    return { error: "Nie możesz zaprosić użytkownika w tej roli." };
  }

  try {
    const result = await inviteClubMember({
      clubId: access.clubId,
      email,
      fullName,
      role: parsedRole.data,
    });

    revalidatePath("/members");
    return {
      success:
        result.delivery === "email"
          ? newUserInviteMessage(result.email)
          : existingUserInviteMessage(result.email),
      inviteDelivery: result.delivery,
    };
  } catch (err) {
    if (err instanceof AuthInviteRateLimitError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Nie udało się wysłać zaproszenia." };
  }
}

async function loadInvitationForAction(membershipId: string, clubId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role, status, created_at, updated_at")
    .eq("id", membershipId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function resendInvite(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberInvite(access);
  if (denied) return denied;

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) return { error: "Nieprawidłowe zaproszenie." };

  const membership = await loadInvitationForAction(membershipId, access.clubId);
  if (!membership) return { error: "Nie znaleziono zaproszenia." };

  const role = parseTargetRole(membership.role);
  if (!role || !canInviteClubRole(access.roles, role)) {
    return { error: "Nie możesz zarządzać tym zaproszeniem." };
  }

  const displayStatus = deriveInvitationStatus(
    membership.status,
    membership.created_at,
    membership.updated_at,
  );
  if (!displayStatus || !canResendInvitation(displayStatus)) {
    return { error: "Można ponowić tylko oczekujące lub wygasłe zaproszenia." };
  }

  try {
    const result = await resendClubInvite({
      clubId: access.clubId,
      membershipId,
    });
    revalidatePath("/members");
    return {
      success:
        result.delivery === "email"
          ? `Ponownie wysłano e-mail z zaproszeniem na ${result.email}.`
          : `Odświeżono zaproszenie dla ${result.email}. Użytkownik ma już konto — powinien się zalogować, aby aktywować członkostwo.`,
      inviteDelivery: result.delivery,
    };
  } catch (err) {
    if (err instanceof AuthInviteRateLimitError) {
      return { error: err.message };
    }
    return { error: err instanceof Error ? err.message : "Nie udało się ponowić zaproszenia." };
  }
}

export async function revokeInvite(
  _prev: MemberActionState,
  formData: FormData,
): Promise<MemberActionState> {
  const access = await requireAccessContext();
  const denied = requireMemberInvite(access);
  if (denied) return denied;

  const membershipId = String(formData.get("membershipId") ?? "").trim();
  if (!membershipId) return { error: "Nieprawidłowe zaproszenie." };

  const membership = await loadInvitationForAction(membershipId, access.clubId);
  if (!membership) return { error: "Nie znaleziono zaproszenia." };

  const role = parseTargetRole(membership.role);
  if (!role || !canInviteClubRole(access.roles, role)) {
    return { error: "Nie możesz zarządzać tym zaproszeniem." };
  }

  const displayStatus = deriveInvitationStatus(
    membership.status,
    membership.created_at,
    membership.updated_at,
  );
  if (!displayStatus || !canRevokeInvitation(displayStatus)) {
    return { error: "Można anulować tylko oczekujące lub wygasłe zaproszenia." };
  }

  try {
    await revokeClubInvite({ clubId: access.clubId, membershipId });
    revalidatePath("/members");
    return { success: "Zaproszenie zostało anulowane." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Nie udało się anulować zaproszenia." };
  }
}
