import {
  isExcludedFromBulkMemberMutation,
  OWNER_BULK_EXCLUSION_MESSAGE,
} from "@/lib/members/member-bulk-eligibility";
import { canAssignClubRole, canManageMemberTarget } from "@/lib/members/guards";
import { createClient } from "@/lib/supabase/server";
import { parseClubRole } from "@/lib/validators";
import type {
  BulkMemberActionItem,
  BulkMemberActionResult,
  BulkMemberOperation,
} from "@/lib/members/bulk-member-types";
import type { ClubRole } from "@/types/rbac";
import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_BULK_MEMBERS = 50;

export const ROLE_UNCHANGED_SKIP_MESSAGE = "Rola bez zmian";

export type MembershipRow = {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  status: string;
};

type SingleMutationResult =
  | { ok: true }
  | { ok: false; error: string; itemStatus: "skipped" | "failed" };

export function parseTargetRole(role: string): ClubRole | null {
  const parsed = parseClubRole(role);
  return parsed.success ? parsed.data : null;
}

export function normalizeMembershipIds(rawIds: string[]): string[] {
  const unique = [...new Set(rawIds.map((id) => id.trim()).filter(Boolean))];
  return unique;
}

export function assertBulkMembershipIds(ids: string[]): string | null {
  if (ids.length === 0) {
    return "Nie wybrano członków.";
  }
  if (ids.length > MAX_BULK_MEMBERS) {
    return `Można przetworzyć maksymalnie ${MAX_BULK_MEMBERS} członków naraz.`;
  }
  return null;
}

export function parseMembershipIdsFromFormData(formData: FormData): string[] {
  const raw = String(formData.get("membershipIds") ?? "").trim();
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeMembershipIds(parsed.map(String));
  } catch {
    return [];
  }
}

export async function loadMembership(
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

export async function loadMemberships(
  membershipIds: string[],
  clubId: string,
): Promise<Map<string, MembershipRow>> {
  if (membershipIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role, status")
    .eq("club_id", clubId)
    .in("id", membershipIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((row) => [row.id, row]));
}

function evaluateSuspendEligibility(
  membership: MembershipRow | undefined,
  actorRoles: ClubRole[],
): SingleMutationResult | { ok: true; membership: MembershipRow } {
  if (!membership) {
    return { ok: false, error: "Nie znaleziono członkostwa.", itemStatus: "failed" };
  }

  const currentRole = parseTargetRole(membership.role);
  if (!currentRole) {
    return { ok: false, error: "Nieprawidłowa rola członka.", itemStatus: "failed" };
  }

  if (!canManageMemberTarget(actorRoles, currentRole)) {
    return { ok: false, error: "Nie możesz zarządzać tym członkiem.", itemStatus: "skipped" };
  }

  if (membership.status !== "active") {
    return {
      ok: false,
      error: "Można zawiesić tylko aktywnego członka.",
      itemStatus: "skipped",
    };
  }

  return { ok: true, membership };
}

function evaluateReactivateEligibility(
  membership: MembershipRow | undefined,
  actorRoles: ClubRole[],
): SingleMutationResult | { ok: true; membership: MembershipRow } {
  if (!membership) {
    return { ok: false, error: "Nie znaleziono członkostwa.", itemStatus: "failed" };
  }

  const currentRole = parseTargetRole(membership.role);
  if (!currentRole) {
    return { ok: false, error: "Nieprawidłowa rola członka.", itemStatus: "failed" };
  }

  if (!canManageMemberTarget(actorRoles, currentRole)) {
    return { ok: false, error: "Nie możesz zarządzać tym członkiem.", itemStatus: "skipped" };
  }

  if (membership.status !== "suspended") {
    return {
      ok: false,
      error: "Można przywrócić tylko zawieszonego członka.",
      itemStatus: "skipped",
    };
  }

  return { ok: true, membership };
}

async function applyStatusUpdate(
  supabase: SupabaseClient,
  membershipId: string,
  clubId: string,
  status: "active" | "suspended",
  failureMessage: string,
): Promise<SingleMutationResult> {
  const { error } = await supabase
    .from("club_memberships")
    .update({ status })
    .eq("id", membershipId)
    .eq("club_id", clubId);

  if (error) {
    return { ok: false, error: failureMessage, itemStatus: "failed" };
  }

  return { ok: true };
}

function evaluateRoleChangeEligibility(
  membership: MembershipRow | undefined,
  actorRoles: ClubRole[],
  targetRole: ClubRole,
  options?: { skipSameRole?: boolean },
): SingleMutationResult | { ok: true; membership: MembershipRow } {
  if (!membership) {
    return { ok: false, error: "Nie znaleziono członkostwa.", itemStatus: "failed" };
  }

  const currentRole = parseTargetRole(membership.role);
  if (!currentRole) {
    return { ok: false, error: "Nieprawidłowa rola członka.", itemStatus: "failed" };
  }

  if (!canManageMemberTarget(actorRoles, currentRole)) {
    return { ok: false, error: "Nie możesz zarządzać tym członkiem.", itemStatus: "skipped" };
  }

  if (!canAssignClubRole(actorRoles, targetRole)) {
    return { ok: false, error: "Nie możesz przypisać tej roli.", itemStatus: "skipped" };
  }

  if (options?.skipSameRole && membership.role === targetRole) {
    return { ok: false, error: ROLE_UNCHANGED_SKIP_MESSAGE, itemStatus: "skipped" };
  }

  return { ok: true, membership };
}

async function applyRoleUpdate(
  supabase: SupabaseClient,
  membershipId: string,
  clubId: string,
  targetRole: ClubRole,
): Promise<SingleMutationResult> {
  const { error } = await supabase
    .from("club_memberships")
    .update({ role: targetRole })
    .eq("id", membershipId)
    .eq("club_id", clubId);

  if (error) {
    return { ok: false, error: "Nie udało się zmienić roli członka.", itemStatus: "failed" };
  }

  return { ok: true };
}

export async function changeMembershipRoleById(
  actorRoles: ClubRole[],
  clubId: string,
  membershipId: string,
  targetRole: ClubRole,
): Promise<SingleMutationResult> {
  const membership = await loadMembership(membershipId, clubId);
  const eligibility = evaluateRoleChangeEligibility(
    membership ?? undefined,
    actorRoles,
    targetRole,
  );
  if (!eligibility.ok) {
    return eligibility;
  }

  const supabase = await createClient();
  return applyRoleUpdate(supabase, membershipId, clubId, targetRole);
}

export async function suspendMembershipById(
  actorRoles: ClubRole[],
  clubId: string,
  membershipId: string,
): Promise<SingleMutationResult> {
  const membership = await loadMembership(membershipId, clubId);
  const eligibility = evaluateSuspendEligibility(membership ?? undefined, actorRoles);
  if (!eligibility.ok) {
    return eligibility;
  }

  const supabase = await createClient();
  return applyStatusUpdate(
    supabase,
    membershipId,
    clubId,
    "suspended",
    "Nie udało się zawiesić członka.",
  );
}

export async function reactivateMembershipById(
  actorRoles: ClubRole[],
  clubId: string,
  membershipId: string,
): Promise<SingleMutationResult> {
  const membership = await loadMembership(membershipId, clubId);
  const eligibility = evaluateReactivateEligibility(membership ?? undefined, actorRoles);
  if (!eligibility.ok) {
    return eligibility;
  }

  const supabase = await createClient();
  return applyStatusUpdate(
    supabase,
    membershipId,
    clubId,
    "active",
    "Nie udało się przywrócić członka.",
  );
}

function summarizeBulkItems(items: BulkMemberActionItem[]): Omit<BulkMemberActionResult, "operation" | "total" | "items"> {
  return {
    succeeded: items.filter((i) => i.status === "success").length,
    skipped: items.filter((i) => i.status === "skipped").length,
    failed: items.filter((i) => i.status === "failed").length,
  };
}

export async function runBulkMemberStatusMutation(
  operation: BulkMemberOperation,
  actorRoles: ClubRole[],
  clubId: string,
  membershipIds: string[],
): Promise<BulkMemberActionResult> {
  const ids = normalizeMembershipIds(membershipIds);
  const batchError = assertBulkMembershipIds(ids);
  if (batchError) {
    return {
      operation,
      total: ids.length,
      succeeded: 0,
      skipped: 0,
      failed: ids.length,
      items: ids.map((membershipId) => ({
        membershipId,
        status: "failed",
        reason: batchError,
      })),
    };
  }

  const membershipMap = await loadMemberships(ids, clubId);
  const supabase = await createClient();
  const items: BulkMemberActionItem[] = [];

  for (const membershipId of ids) {
    const membership = membershipMap.get(membershipId);
    const bulkTargetRole = membership ? parseTargetRole(membership.role) : null;
    if (bulkTargetRole && isExcludedFromBulkMemberMutation(bulkTargetRole)) {
      items.push({
        membershipId,
        status: "skipped",
        reason: OWNER_BULK_EXCLUSION_MESSAGE,
      });
      continue;
    }

    const eligibility =
      operation === "suspend"
        ? evaluateSuspendEligibility(membership, actorRoles)
        : evaluateReactivateEligibility(membership, actorRoles);

    if (!eligibility.ok) {
      items.push({
        membershipId,
        status: eligibility.itemStatus,
        reason: eligibility.error,
      });
      continue;
    }

    const result = await applyStatusUpdate(
      supabase,
      membershipId,
      clubId,
      operation === "suspend" ? "suspended" : "active",
      operation === "suspend"
        ? "Nie udało się zawiesić członka."
        : "Nie udało się przywrócić członka.",
    );

    if (!result.ok) {
      items.push({
        membershipId,
        status: result.itemStatus,
        reason: result.error,
      });
      continue;
    }

    items.push({ membershipId, status: "success" });
  }

  const summary = summarizeBulkItems(items);
  return {
    operation,
    total: ids.length,
    ...summary,
    items,
  };
}

export async function runBulkMemberRoleMutation(
  actorRoles: ClubRole[],
  clubId: string,
  membershipIds: string[],
  targetRole: ClubRole,
): Promise<BulkMemberActionResult> {
  const operation: BulkMemberOperation = "changeRole";
  const ids = normalizeMembershipIds(membershipIds);
  const batchError = assertBulkMembershipIds(ids);
  if (batchError) {
    return {
      operation,
      targetRole,
      total: ids.length,
      succeeded: 0,
      skipped: 0,
      failed: ids.length,
      items: ids.map((membershipId) => ({
        membershipId,
        status: "failed",
        reason: batchError,
      })),
    };
  }

  const membershipMap = await loadMemberships(ids, clubId);
  const supabase = await createClient();
  const items: BulkMemberActionItem[] = [];

  for (const membershipId of ids) {
    const membership = membershipMap.get(membershipId);
    const bulkTargetRole = membership ? parseTargetRole(membership.role) : null;
    if (bulkTargetRole && isExcludedFromBulkMemberMutation(bulkTargetRole)) {
      items.push({
        membershipId,
        status: "skipped",
        reason: OWNER_BULK_EXCLUSION_MESSAGE,
      });
      continue;
    }

    const eligibility = evaluateRoleChangeEligibility(
      membership,
      actorRoles,
      targetRole,
      { skipSameRole: true },
    );

    if (!eligibility.ok) {
      items.push({
        membershipId,
        status: eligibility.itemStatus,
        reason: eligibility.error,
      });
      continue;
    }

    const result = await applyRoleUpdate(supabase, membershipId, clubId, targetRole);
    if (!result.ok) {
      items.push({
        membershipId,
        status: result.itemStatus,
        reason: result.error,
      });
      continue;
    }

    items.push({ membershipId, status: "success" });
  }

  const summary = summarizeBulkItems(items);
  return {
    operation,
    targetRole,
    total: ids.length,
    ...summary,
    items,
  };
}
