"use client";

import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { InviteMemberForm } from "@/features/members/components/invite-member-form";
import { InvitationsPanel } from "@/features/members/components/invitations-panel";
import { MembersPanel } from "@/features/members/components/members-panel";
import { INVITABLE_CLUB_ROLES } from "@/lib/members/invite-roles";
import { canInviteClubRole, canInviteMembers } from "@/lib/members/guards";
import {
  countInvitationsByStatus,
  countInvitationsRequiringAction,
  type ClubInvitationRow,
  type MembersDashboardCounts,
} from "@/lib/members/invitation-utils";
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
  const invitationStatusCounts = countInvitationsByStatus(invitations);
  const actionRequired = countInvitationsRequiringAction(invitations);

  const assignableRoles = INVITABLE_CLUB_ROLES.filter((role) =>
    canInviteClubRole(actorRoles, role),
  );

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Aktywni członkowie</p>
          <p className="text-2xl font-semibold">{counts.active}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Zawieszeni</p>
          <p className="text-2xl font-semibold">{counts.suspended}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Oczekujące zaproszenia:</p>
          <p className="text-2xl font-semibold">{invitationStatusCounts.pending}</p>
        </div>
        <div className="rounded-lg border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">Wymaga działania</p>
          <p className={cn("text-2xl font-semibold", actionRequired > 0 && "text-amber-600")}>
            {actionRequired}
          </p>
          <p className="text-[11px] text-muted-foreground">oczekujące + wygasłe</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="default">Aktywni: {counts.active}</Badge>
        <Badge variant="outline">Zawieszeni: {counts.suspended}</Badge>
        <Badge variant="secondary">Oczekujące: {invitationStatusCounts.pending}</Badge>
        <Badge variant="outline">Wygasłe: {invitationStatusCounts.expired}</Badge>
        <Badge variant="default">Zaakceptowane: {invitationStatusCounts.accepted}</Badge>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(
          [
            { id: "members" as const, label: "Członkowie", hint: `${rosterMembers.length} w kadze` },
            {
              id: "invitations" as const,
              label: "Zaproszenia",
              hint: actionRequired > 0 ? `${actionRequired} do obsługi` : `${invitations.length} łącznie`,
            },
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
            <span>{tab.label}</span>
            <span className="ml-1.5 text-xs opacity-80">({tab.hint})</span>
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
          {canInvite ? (
            <InviteMemberForm assignableRoles={assignableRoles} />
          ) : null}
          <p className="text-sm text-muted-foreground">
            Historia zaproszeń — użyj filtrów, aby zobaczyć zaproszenia wymagające działania.
          </p>
          <InvitationsPanel invitations={invitations} canManage={canInvite} />
        </div>
      )}
    </div>
  );
}
