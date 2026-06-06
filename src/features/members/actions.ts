"use server";

import { revalidatePath } from "next/cache";

import { canManageMembers } from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import {
  canAssignClubRole,
  canManageMemberTarget,
} from "@/lib/members/guards";
import { createClient } from "@/lib/supabase/server";
import { parseClubRole } from "@/lib/validators";
import type { ClubRole } from "@/types/rbac";

export type MemberActionState = {
  error?: string;
  success?: string;
};

type MembershipRow = {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  status: string;
};

function requireMemberManage(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canManageMembers(access.roles)) {
    return { error: "Brak uprawnień do zarządzania członkami." };
  }
  return null;
}

async function loadMembership(
  membershipId: string,
  clubId: string,
): Promise<MembershipRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role, status")
    .eq("id", membershipId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function parseTargetRole(role: string): ClubRole | null {
  const parsed = parseClubRole(role);
  return parsed.success ? parsed.data : null;
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

  if (membership.status !== "active") {
    return { error: "Można zawiesić tylko aktywnego członka." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_memberships")
    .update({ status: "suspended" })
    .eq("id", membershipId)
    .eq("club_id", access.clubId);

  if (error) {
    return { error: "Nie udało się zawiesić członka." };
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

  if (membership.status !== "suspended") {
    return { error: "Można przywrócić tylko zawieszonego członka." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("club_memberships")
    .update({ status: "active" })
    .eq("id", membershipId)
    .eq("club_id", access.clubId);

  if (error) {
    return { error: "Nie udało się przywrócić członka." };
  }

  revalidatePath("/members");
  return { success: "Członek został przywrócony." };
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
