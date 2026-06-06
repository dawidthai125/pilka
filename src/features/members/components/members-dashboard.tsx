"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { InviteMemberForm } from "@/features/members/components/invite-member-form";
import { InvitationsPanel } from "@/features/members/components/invitations-panel";
import { MembersPanel } from "@/features/members/components/members-panel";
import { INVITABLE_CLUB_ROLES } from "@/lib/members/invite-roles";
import { canInviteClubRole, canInviteMembers } from "@/lib/members/guards";
import type { ClubInvitationRow, MembersDashboardCounts } from "@/lib/members/invitation-utils";
import type { ClubMemberRow } from "@/lib/auth/session";
import type { ClubRole } from "@/types/rbac";
import { cn } from "@/lib/utils";

type TabId = "members" | "invitations";

export function MembersDashboard({
  members,
  invitations,
  counts,
  actorRoles,
  canManage,
}: {
  members: ClubMemberRow[];
  invitations: ClubInvitationRow[];
  counts: MembersDashboardCounts;
  actorRoles: ClubRole[];
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<TabId>("members");
  const canInvite = canInviteMembers(actorRoles);

  const rosterMembers = members.filter((m) => m.status === "active" || m.status === "suspended");

  const assignableRoles = INVITABLE_CLUB_ROLES.filter((role) =>
    canInviteClubRole(actorRoles, role),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Aktywni: {counts.active}</Badge>
        <Badge variant="secondary">Zaproszeni: {counts.invited}</Badge>
        <Badge variant="outline">Zawieszeni: {counts.suspended}</Badge>
        <Badge variant="secondary">Oczekujące zaproszenia: {counts.pendingInvites}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(
          [
            { id: "members" as const, label: "Członkowie" },
            { id: "invitations" as const, label: "Zaproszenia" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "members" ? (
        <div className="space-y-6">
          {canInvite ? (
            <InviteMemberForm assignableRoles={assignableRoles} />
          ) : null}
          <MembersPanel members={rosterMembers} actorRoles={actorRoles} canManage={canManage} />
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Historia zaproszeń klubu — oczekujące, zaakceptowane, wygasłe i anulowane.
          </p>
          <InvitationsPanel invitations={invitations} canManage={canInvite} />
        </div>
      )}
    </div>
  );
}
