import type { ClubRole } from "@/types/rbac";

export const INVITE_EXPIRY_DAYS = 7;

export type InvitationDisplayStatus = "pending" | "accepted" | "expired" | "revoked";

export type ClubInvitationRow = {
  id: string;
  membershipId: string;
  userId: string;
  email: string;
  fullName: string | null;
  role: ClubRole;
  roleLabel: string;
  sentAt: string;
  status: InvitationDisplayStatus;
  membershipStatus: string;
};

export function deriveInvitationStatus(
  membershipStatus: string,
  createdAt: string,
  updatedAt: string,
): InvitationDisplayStatus | null {
  if (membershipStatus === "archived") {
    return "revoked";
  }

  if (membershipStatus === "invited") {
    const sentAt = updatedAt || createdAt;
    const ageMs = Date.now() - new Date(sentAt).getTime();
    const expiryMs = INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return ageMs > expiryMs ? "expired" : "pending";
  }

  if (membershipStatus === "active") {
    const created = new Date(createdAt).getTime();
    const updated = new Date(updatedAt).getTime();
    if (updated > created + 60_000) {
      return "accepted";
    }
  }

  return null;
}

export function canResendInvitation(status: InvitationDisplayStatus): boolean {
  return status === "pending" || status === "expired";
}

export function canRevokeInvitation(status: InvitationDisplayStatus): boolean {
  return status === "pending" || status === "expired";
}

export type MembersDashboardCounts = {
  active: number;
  invited: number;
  suspended: number;
  pendingInvites: number;
};

export function computeMembersDashboardCounts(
  members: Array<{ status: string; created_at: string }>,
  invitations: ClubInvitationRow[],
): MembersDashboardCounts {
  const active = members.filter((m) => m.status === "active").length;
  const invited = members.filter((m) => m.status === "invited").length;
  const suspended = members.filter((m) => m.status === "suspended").length;
  const pendingInvites = invitations.filter((i) => i.status === "pending").length;

  return { active, invited, suspended, pendingInvites };
}
