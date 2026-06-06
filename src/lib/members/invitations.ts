import { cache } from "react";

import { ROLE_LABELS } from "@/config/permissions";
import { resolveTenantClubId } from "@/lib/tenant/resolve";
import { createClient } from "@/lib/supabase/server";
import { parseClubRole } from "@/lib/validators";

import {
  deriveInvitationStatus,
  type ClubInvitationRow,
} from "./invitation-utils";

export {
  INVITE_EXPIRY_DAYS,
  INVITATION_STATUS_ORDER,
  deriveInvitationStatus,
  canResendInvitation,
  canRevokeInvitation,
  computeMembersDashboardCounts,
  countInvitationsByStatus,
  countInvitationsRequiringAction,
  type ClubInvitationRow,
  type InvitationDisplayStatus,
  type InvitationStatusCounts,
  type MembersDashboardCounts,
} from "./invitation-utils";

export const getClubInvitations = cache(
  async (clubId?: string): Promise<ClubInvitationRow[]> => {
    const tenantClubId = await resolveTenantClubId(clubId);
    const supabase = await createClient();

    const { data: memberships, error } = await supabase
      .from("club_memberships")
      .select("id, user_id, role, status, created_at, updated_at")
      .eq("club_id", tenantClubId)
      .in("status", ["invited", "archived", "active"])
      .neq("role", "owner")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    if (!memberships?.length) return [];

    const userIds = [...new Set(memberships.map((m) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);

    return memberships.flatMap((membership) => {
      const parsedRole = parseClubRole(membership.role);
      if (!parsedRole.success) return [];

      const displayStatus = deriveInvitationStatus(
        membership.status,
        membership.created_at,
        membership.updated_at,
      );
      if (!displayStatus) return [];

      const profile = profileMap.get(membership.user_id);

      return [
        {
          id: membership.id,
          membershipId: membership.id,
          userId: membership.user_id,
          email: profile?.email ?? "—",
          fullName: profile?.full_name ?? null,
          role: parsedRole.data,
          roleLabel: ROLE_LABELS[parsedRole.data],
          sentAt: membership.updated_at || membership.created_at,
          status: displayStatus,
          membershipStatus: membership.status,
        },
      ];
    });
  },
);
