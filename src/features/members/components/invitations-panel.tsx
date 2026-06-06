"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
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
import {
  resendInvite,
  revokeInvite,
  type MemberActionState,
} from "@/features/members/actions";
import {
  canResendInvitation,
  canRevokeInvitation,
  type ClubInvitationRow,
  type InvitationDisplayStatus,
} from "@/lib/members/invitation-utils";

const STATUS_LABELS: Record<InvitationDisplayStatus, string> = {
  pending: "Oczekujące",
  accepted: "Zaakceptowane",
  expired: "Wygasłe",
  revoked: "Anulowane",
};

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
            <Button type="submit" disabled={pending} className={tone === "danger" ? "bg-red-700 hover:bg-red-600" : ""}>
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
        description={`Wyślij ponownie zaproszenie do ${label}.`}
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

export function InvitationsPanel({
  invitations,
  canManage,
}: {
  invitations: ClubInvitationRow[];
  canManage: boolean;
}) {
  if (invitations.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
        Brak zaproszeń w historii klubu
      </div>
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
          {invitations.map((invitation) => (
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
