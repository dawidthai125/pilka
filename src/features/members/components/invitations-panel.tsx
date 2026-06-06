"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { resendInvite, revokeInvite } from "@/features/members/actions";
import type { MemberActionState } from "@/lib/members/bulk-member-types";
import {
  canResendInvitation,
  canRevokeInvitation,
  countInvitationsByStatus,
  countInvitationsRequiringAction,
  INVITATION_STATUS_ORDER,
  type ClubInvitationRow,
  type InvitationDisplayStatus,
} from "@/lib/members/invitation-utils";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<InvitationDisplayStatus, string> = {
  pending: "Oczekujące",
  accepted: "Zaakceptowane",
  expired: "Wygasłe",
  revoked: "Anulowane",
};

const STATUS_DESCRIPTIONS: Record<InvitationDisplayStatus, string> = {
  pending: "Oczekują na akceptację (e-mail lub logowanie). Ważne 7 dni od ostatniego wysłania.",
  expired: "Link wygasł — ponów zaproszenie lub anuluj.",
  accepted: "Użytkownik zalogował się i ma aktywne członkostwo.",
  revoked: "Zaproszenie anulowane przez administratora.",
};

type InvitationFilter = "action_required" | "all" | InvitationDisplayStatus;

function statusVariant(
  status: InvitationDisplayStatus,
): "default" | "outline" | "secondary" | "destructive" {
  if (status === "pending") return "secondary";
  if (status === "accepted") return "default";
  if (status === "expired") return "outline";
  return "destructive";
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return "—";
  }
}

function InviteActionDialog({
  open,
  title,
  description,
  confirmLabel,
  action,
  membershipId,
  tone = "default",
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  action: (_prev: MemberActionState, formData: FormData) => Promise<MemberActionState>;
  membershipId: string;
  tone?: "default" | "danger";
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(action, {} as MemberActionState);

  useEffect(() => {
    if (state.success) {
      onClose();
      router.refresh();
    }
  }, [state.success, onClose, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="max-w-md rounded-xl border border-white/15 bg-[#0a1410] p-5 text-sm text-white shadow-xl"
        role="dialog"
      >
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-2 text-white/65">{description}</p>
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="membershipId" value={membershipId} />
          {state.error ? <p className="text-red-300">{state.error}</p> : null}
          {state.success ? <p className="text-green-300">{state.success}</p> : null}
          <div className="flex flex-wrap justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="border-white/20 bg-transparent text-white hover:bg-white/10"
              onClick={onClose}
              disabled={pending}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={pending}
              className={tone === "danger" ? "bg-red-700 hover:bg-red-600" : ""}
            >
              {pending ? "Zapisywanie…" : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InvitationRowActions({
  invitation,
  canManage,
}: {
  invitation: ClubInvitationRow;
  canManage: boolean;
}) {
  const [dialog, setDialog] = useState<"resend" | "revoke" | null>(null);

  if (!canManage) return <span className="text-xs text-muted-foreground">—</span>;

  const canResend = canResendInvitation(invitation.status);
  const canRevoke = canRevokeInvitation(invitation.status);

  if (!canResend && !canRevoke) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const label = invitation.fullName ?? invitation.email;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Akcje zaproszenia"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canResend ? (
            <DropdownMenuItem onClick={() => setDialog("resend")}>Ponów zaproszenie</DropdownMenuItem>
          ) : null}
          {canRevoke ? (
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => setDialog("revoke")}
            >
              Anuluj zaproszenie
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <InviteActionDialog
        open={dialog === "resend"}
        title="Ponów zaproszenie"
        description={`Wyślij ponownie zaproszenie do ${label}. Dla istniejących kont wysłana zostanie instrukcja logowania.`}
        confirmLabel="Wyślij ponownie"
        action={resendInvite}
        membershipId={invitation.membershipId}
        onClose={() => setDialog(null)}
      />

      <InviteActionDialog
        open={dialog === "revoke"}
        title="Anuluj zaproszenie"
        description={`Czy na pewno chcesz anulować zaproszenie dla ${label}? Link nie będzie już aktywny.`}
        confirmLabel="Anuluj zaproszenie"
        tone="danger"
        action={revokeInvite}
        membershipId={invitation.membershipId}
        onClose={() => setDialog(null)}
      />
    </>
  );
}

function InvitationsTable({
  rows,
  canManage,
}: {
  rows: ClubInvitationRow[];
  canManage: boolean;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
        Brak zaproszeń w tej kategorii
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Rola</th>
            <th className="px-4 py-3 font-medium">Data wysłania</th>
            <th className="px-4 py-3 font-medium">Status</th>
            {canManage ? <th className="px-4 py-3 text-right font-medium">Akcje</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((invitation) => (
            <tr key={invitation.id} className="border-b last:border-b-0">
              <td className="px-4 py-3">
                <p className="font-medium">{invitation.email}</p>
                {invitation.fullName ? (
                  <p className="text-xs text-muted-foreground">{invitation.fullName}</p>
                ) : null}
              </td>
              <td className="px-4 py-3">
                <Badge variant="outline">{invitation.roleLabel}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{formatDate(invitation.sentAt)}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(invitation.status)}>
                  {STATUS_LABELS[invitation.status]}
                </Badge>
              </td>
              {canManage ? (
                <td className="px-4 py-3 text-right">
                  <InvitationRowActions invitation={invitation} canManage={canManage} />
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InvitationStatusSection({
  status,
  rows,
  canManage,
}: {
  status: InvitationDisplayStatus;
  rows: ClubInvitationRow[];
  canManage: boolean;
}) {
  if (rows.length === 0) return null;

  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold">{STATUS_LABELS[status]}</h4>
        <Badge variant={statusVariant(status)}>{rows.length}</Badge>
      </div>
      <p className="text-xs text-muted-foreground">{STATUS_DESCRIPTIONS[status]}</p>
      <InvitationsTable rows={rows} canManage={canManage} />
    </section>
  );
}

export function InvitationsPanel({
  invitations,
  canManage,
}: {
  invitations: ClubInvitationRow[];
  canManage: boolean;
}) {
  const [filter, setFilter] = useState<InvitationFilter>("action_required");
  const statusCounts = useMemo(() => countInvitationsByStatus(invitations), [invitations]);
  const actionRequired = useMemo(() => countInvitationsRequiringAction(invitations), [invitations]);

  const filteredInvitations = useMemo(() => {
    if (filter === "all") return invitations;
    if (filter === "action_required") {
      return invitations.filter((i) => i.status === "pending" || i.status === "expired");
    }
    return invitations.filter((i) => i.status === filter);
  }, [filter, invitations]);

  const filterChips: { id: InvitationFilter; label: string; count: number }[] = [
    { id: "action_required", label: "Wymaga działania", count: actionRequired },
    { id: "pending", label: STATUS_LABELS.pending, count: statusCounts.pending },
    { id: "expired", label: STATUS_LABELS.expired, count: statusCounts.expired },
    { id: "accepted", label: STATUS_LABELS.accepted, count: statusCounts.accepted },
    { id: "revoked", label: STATUS_LABELS.revoked, count: statusCounts.revoked },
    { id: "all", label: "Wszystkie", count: invitations.length },
  ];

  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Brak zaproszeń w historii klubu
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => setFilter(chip.id)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              filter === chip.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {chip.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                filter === chip.id ? "bg-primary-foreground/20" : "bg-muted",
              )}
            >
              {chip.count}
            </span>
          </button>
        ))}
      </div>

      {actionRequired > 0 && filter !== "action_required" ? (
        <p className="text-sm text-amber-800 dark:text-amber-200">
          {actionRequired}{" "}
          {actionRequired === 1 ? "zaproszenie wymaga" : "zaproszeń wymaga"} Twojej uwagi (oczekujące lub
          wygasłe).
        </p>
      ) : null}

      {filter === "all" ? (
        <div className="space-y-8">
          {INVITATION_STATUS_ORDER.map((status) => (
            <InvitationStatusSection
              key={status}
              status={status}
              rows={invitations.filter((i) => i.status === status)}
              canManage={canManage}
            />
          ))}
        </div>
      ) : (
        <InvitationsTable rows={filteredInvitations} canManage={canManage} />
      )}
    </div>
  );
}
