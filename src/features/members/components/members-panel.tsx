"use client";

import { useActionState, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Download, MoreHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CLUB_ROLES,
  ROLE_LABELS,
} from "@/config/permissions";
import {
  bulkChangeMemberRoles,
  bulkReactivateMembers,
  bulkRemoveMembers,
  bulkSuspendMembers,
  changeMemberRole,
  reactivateMember,
  removeMember,
  suspendMember,
} from "@/features/members/actions";
import {
  formatBulkMemberSummary,
  type BulkMemberActionResult,
  type BulkMemberActionState,
  type MemberActionState,
} from "@/lib/members/bulk-member-types";
import {
  countEligibleForBulkReactivate,
  countEligibleForBulkRemove,
  countEligibleForBulkRoleChange,
  countEligibleForBulkSuspend,
  countOwnersInSelection,
  getBulkReactivateTargetIds,
  getBulkRemoveTargetIds,
  getBulkRoleChangeTargetIds,
  getBulkSuspendTargetIds,
} from "@/lib/members/member-bulk-eligibility";
import { canManageMemberTarget } from "@/lib/members/guards";
import { downloadMembersCsv } from "@/lib/members/export-members-csv";
import type { ClubMemberRow } from "@/lib/auth/session";
import type { ClubRole } from "@/types/rbac";
import { cn } from "@/lib/utils";

const MEMBERSHIP_STATUS_LABELS: Record<string, string> = {
  active: "Aktywny",
  invited: "Zaproszony",
  suspended: "Zawieszony",
};

function formatJoinDate(value: string) {
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

function statusBadgeVariant(status: string): "default" | "outline" | "secondary" {
  if (status === "active") return "default";
  if (status === "invited") return "secondary";
  return "outline";
}

function MemberActionDialog({
  open,
  title,
  description,
  confirmLabel,
  action,
  formFields,
  tone = "default",
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  action: (_prev: MemberActionState, formData: FormData) => Promise<MemberActionState>;
  formFields: ReactNode;
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
          {formFields}
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
            <Button
              type="submit"
              disabled={pending}
              className={cn(
                tone === "danger" && "bg-red-700 hover:bg-red-600",
              )}
            >
              {pending ? "Zapisywanie…" : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function memberDisplayName(member: ClubMemberRow | undefined): string {
  return member?.profile?.full_name ?? member?.profile?.email ?? "Członek";
}

function BulkMemberActionDialog({
  open,
  title,
  description,
  confirmLabel,
  membershipIds,
  action,
  onClose,
  onComplete,
  extraFields,
  tone = "default",
  requireIrreversibleAck = false,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  membershipIds: string[];
  action: (
    _prev: BulkMemberActionState,
    formData: FormData,
  ) => Promise<BulkMemberActionState>;
  onClose: () => void;
  onComplete: (result: BulkMemberActionResult) => void;
  extraFields?: ReactNode;
  tone?: "default" | "danger";
  requireIrreversibleAck?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {} as BulkMemberActionState);
  const [irreversibleAck, setIrreversibleAck] = useState(false);

  useEffect(() => {
    if (!open) {
      setIrreversibleAck(false);
    }
  }, [open]);

  useEffect(() => {
    if (state.error) return;
    if (state.result) {
      onClose();
      onComplete(state.result);
    }
  }, [state.error, state.result, onClose, onComplete]);

  if (!open) return null;

  const submitDisabled = pending || (requireIrreversibleAck && !irreversibleAck);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className={cn(
          "max-w-md rounded-xl border p-5 text-sm text-white shadow-xl",
          tone === "danger" ? "border-red-500/40 bg-[#1a0a0a]" : "border-white/15 bg-[#0a1410]",
        )}
        role="dialog"
      >
        <h3
          className={cn(
            "text-base font-semibold",
            tone === "danger" ? "text-red-200" : undefined,
          )}
        >
          {title}
        </h3>
        <p className="mt-2 whitespace-pre-line text-white/65">{description}</p>
        <form action={formAction} className="mt-4 space-y-3">
          <input
            type="hidden"
            name="membershipIds"
            value={JSON.stringify(membershipIds)}
          />
          {extraFields}
          {requireIrreversibleAck ? (
            <label className="flex cursor-pointer items-start gap-2 text-white/80">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={irreversibleAck}
                onChange={(event) => setIrreversibleAck(event.target.checked)}
              />
              <span>Rozumiem, że operacja jest nieodwracalna</span>
            </label>
          ) : null}
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
            <Button
              type="submit"
              disabled={submitDisabled}
              className={
                tone === "danger"
                  ? "bg-red-700 text-white hover:bg-red-600 disabled:opacity-50"
                  : undefined
              }
            >
              {pending ? "Zapisywanie…" : confirmLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BulkActionResultPanel({
  result,
  membersById,
  onDismiss,
}: {
  result: BulkMemberActionResult;
  membersById: Map<string, ClubMemberRow>;
  onDismiss: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const nonSuccess = result.items.filter((item) => item.status !== "success");
  const summary = formatBulkMemberSummary(result);
  const tone =
    result.succeeded === result.total
      ? "border-green-500/40 bg-green-500/10 text-green-950 dark:text-green-50"
      : result.succeeded > 0
        ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-50"
        : "border-red-500/40 bg-red-500/10 text-red-950 dark:text-red-50";

  return (
    <div className={cn("rounded-lg border px-4 py-3 text-sm", tone)} role="status">
      <p className="font-medium">{summary}</p>
      {nonSuccess.length > 0 ? (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs underline opacity-80 hover:opacity-100"
            onClick={() => setShowDetails((v) => !v)}
          >
            {showDetails ? "Ukryj szczegóły" : "Pokaż szczegóły"}
          </button>
          {showDetails ? (
            <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs opacity-90">
              {nonSuccess.map((item) => (
                <li key={item.membershipId}>
                  {memberDisplayName(membersById.get(item.membershipId))}: {item.reason}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3">
        <Button type="button" variant="outline" size="sm" onClick={onDismiss}>
          Zamknij
        </Button>
      </div>
    </div>
  );
}

function MemberRowActions({
  member,
  actorRoles,
  assignableRoles,
}: {
  member: ClubMemberRow;
  actorRoles: ClubRole[];
  assignableRoles: ClubRole[];
}) {
  const canManage = canManageMemberTarget(actorRoles, member.role);
  const [dialog, setDialog] = useState<"role" | "suspend" | "reactivate" | "remove" | null>(null);

  if (!canManage) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const displayName = member.profile?.full_name ?? member.profile?.email ?? "Użytkownik";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          aria-label="Akcje członka"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setDialog("role")}>Zmień rolę</DropdownMenuItem>
          {member.status === "active" ? (
            <DropdownMenuItem onClick={() => setDialog("suspend")}>Zawieś</DropdownMenuItem>
          ) : null}
          {member.status === "suspended" ? (
            <DropdownMenuItem onClick={() => setDialog("reactivate")}>Przywróć</DropdownMenuItem>
          ) : null}
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setDialog("remove")}
          >
            Usuń
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <MemberActionDialog
        open={dialog === "role"}
        title="Zmień rolę"
        description={`Wybierz nową rolę dla ${displayName}.`}
        confirmLabel="Zapisz rolę"
        action={changeMemberRole}
        onClose={() => setDialog(null)}
        formFields={
          <>
            <input type="hidden" name="membershipId" value={member.id} />
            <select
              name="role"
              defaultValue={member.role}
              className="border-input min-h-[44px] w-full rounded-md border bg-background px-3 text-foreground"
              required
            >
              {assignableRoles.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </>
        }
      />

      <MemberActionDialog
        open={dialog === "suspend"}
        title="Zawieś członka"
        description={`Czy na pewno chcesz zawiesić ${displayName}? Użytkownik straci dostęp do panelu klubu.`}
        confirmLabel="Zawieś"
        action={suspendMember}
        onClose={() => setDialog(null)}
        formFields={<input type="hidden" name="membershipId" value={member.id} />}
      />

      <MemberActionDialog
        open={dialog === "reactivate"}
        title="Przywróć członka"
        description={`Czy na pewno chcesz przywrócić dostęp dla ${displayName}?`}
        confirmLabel="Przywróć"
        action={reactivateMember}
        onClose={() => setDialog(null)}
        formFields={<input type="hidden" name="membershipId" value={member.id} />}
      />

      <MemberActionDialog
        open={dialog === "remove"}
        title="Usuń członka"
        description={`Czy na pewno chcesz usunąć ${displayName} z klubu? Profil użytkownika pozostanie w systemie.`}
        confirmLabel="Usuń"
        tone="danger"
        action={removeMember}
        onClose={() => setDialog(null)}
        formFields={<input type="hidden" name="membershipId" value={member.id} />}
      />
    </>
  );
}

export function MembersPanel({
  members,
  actorRoles,
  canManage,
}: {
  members: ClubMemberRow[];
  actorRoles: ClubRole[];
  canManage: boolean;
}) {
  const activeCount = members.filter((m) => m.status === "active").length;
  const invitedCount = members.filter((m) => m.status === "invited").length;
  const onlyInvited = members.length > 0 && activeCount === 0 && invitedCount === members.length;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const assignableRoles = CLUB_ROLES.filter((role) =>
    actorRoles.includes("owner") ? true : role !== "owner",
  );

  const [bulkDialog, setBulkDialog] = useState<
    "suspend" | "reactivate" | "role" | "remove" | null
  >(null);
  const [bulkRoleTarget, setBulkRoleTarget] = useState<ClubRole>(
    () => assignableRoles[0] ?? "coach",
  );
  const [bulkResult, setBulkResult] = useState<BulkMemberActionResult | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const memberIds = useMemo(() => members.map((m) => m.id), [members]);
  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );
  const selectedMembers = useMemo(
    () => members.filter((m) => selectedIds.has(m.id)),
    [members, selectedIds],
  );
  const suspendEligibleCount = countEligibleForBulkSuspend(selectedMembers, actorRoles);
  const reactivateEligibleCount = countEligibleForBulkReactivate(selectedMembers, actorRoles);
  const roleChangeEligibleCount = countEligibleForBulkRoleChange(selectedMembers, actorRoles);
  const removeEligibleCount = countEligibleForBulkRemove(selectedMembers, actorRoles);
  const ownersInSelection = countOwnersInSelection(selectedMembers);
  const bulkTargetIds = useMemo(() => {
    if (bulkDialog === "suspend") {
      return getBulkSuspendTargetIds(selectedMembers, actorRoles);
    }
    if (bulkDialog === "reactivate") {
      return getBulkReactivateTargetIds(selectedMembers, actorRoles);
    }
    if (bulkDialog === "role") {
      return getBulkRoleChangeTargetIds(selectedMembers, actorRoles);
    }
    if (bulkDialog === "remove") {
      return getBulkRemoveTargetIds(selectedMembers, actorRoles);
    }
    return [];
  }, [bulkDialog, selectedMembers, actorRoles]);
  const memberIdKey = memberIds.join("\u0000");
  const selectedCount = selectedIds.size;
  const allSelected = members.length > 0 && selectedCount === members.length;
  const someSelected = selectedCount > 0 && selectedCount < members.length;

  useEffect(() => {
    setSelectedIds((prev) => {
      const valid = new Set(memberIds);
      const next = new Set([...prev].filter((id) => valid.has(id)));
      if (next.size === prev.size && [...next].every((id) => prev.has(id))) {
        return prev;
      }
      return next;
    });
  }, [memberIdKey, memberIds]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  function toggleMemberSelection(memberId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(memberIds));
  }

  function handleExportCsv() {
    const rows =
      selectedCount > 0 ? members.filter((m) => selectedIds.has(m.id)) : members;
    downloadMembersCsv(rows);
  }

  const exportLabel =
    selectedCount > 0
      ? `Eksportuj zaznaczone (${selectedCount})`
      : "Eksportuj wszystkich";

  function handleBulkComplete(result: BulkMemberActionResult) {
    setBulkResult(result);
    if (result.succeeded > 0) {
      setSelectedIds(new Set());
      router.refresh();
    }
  }

  return (
    <div className="space-y-4">
      {members.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          Brak członków klubu
        </div>
      ) : (
        <>
          {onlyInvited ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              Wszyscy członkowie mają status zaproszenia. Po akceptacji konta i pierwszym logowaniu
              status zmieni się automatycznie na aktywny.
            </div>
          ) : invitedCount > 0 ? (
            <div className="rounded-lg border px-4 py-3 text-sm text-muted-foreground">
              {invitedCount} {invitedCount === 1 ? "osoba oczekuje" : "osób oczekuje"} na akceptację
              zaproszenia.
            </div>
          ) : null}

          {bulkResult ? (
            <BulkActionResultPanel
              result={bulkResult}
              membersById={membersById}
              onDismiss={() => setBulkResult(null)}
            />
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <div className="flex flex-col gap-0.5" aria-live="polite" aria-atomic="true">
                <span className="text-muted-foreground">
                  {selectedCount > 0 ? `Zaznaczono: ${selectedCount}` : "Brak zaznaczenia"}
                </span>
                {ownersInSelection > 0 ? (
                  <span className="text-xs text-amber-800 dark:text-amber-200">
                    Właściciel wykluczony z operacji zbiorczych
                  </span>
                ) : null}
              </div>
              {canManage && selectedCount > 0 ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={suspendEligibleCount === 0}
                    onClick={() => setBulkDialog("suspend")}
                  >
                    Zawieś{suspendEligibleCount > 0 ? ` (${suspendEligibleCount})` : ""}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reactivateEligibleCount === 0}
                    onClick={() => setBulkDialog("reactivate")}
                  >
                    Przywróć{reactivateEligibleCount > 0 ? ` (${reactivateEligibleCount})` : ""}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={roleChangeEligibleCount === 0}
                    onClick={() => {
                      setBulkRoleTarget(assignableRoles[0] ?? "coach");
                      setBulkDialog("role");
                    }}
                  >
                    Zmień rolę{roleChangeEligibleCount > 0 ? ` (${roleChangeEligibleCount})` : ""}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={removeEligibleCount === 0}
                    onClick={() => setBulkDialog("remove")}
                    className="border-red-500/40 text-red-800 hover:bg-red-500/10 dark:text-red-200"
                  >
                    Usuń{removeEligibleCount > 0 ? ` (${removeEligibleCount})` : ""}
                  </Button>
                </div>
              ) : null}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={handleExportCsv}>
              <Download className="mr-2 h-4 w-4" aria-hidden />
              {exportLabel}
            </Button>
          </div>

          <BulkMemberActionDialog
            open={bulkDialog === "suspend"}
            title="Zawieś zaznaczonych członków"
            description={`Czy na pewno chcesz zawiesić ${suspendEligibleCount} ${
              suspendEligibleCount === 1 ? "członka" : "członków"
            }? Użytkownicy stracą dostęp do panelu klubu.`}
            confirmLabel={`Zawieś (${suspendEligibleCount})`}
            membershipIds={bulkTargetIds}
            action={bulkSuspendMembers}
            onClose={() => setBulkDialog(null)}
            onComplete={handleBulkComplete}
          />

          <BulkMemberActionDialog
            open={bulkDialog === "reactivate"}
            title="Przywróć zaznaczonych członków"
            description={`Czy na pewno chcesz przywrócić dostęp dla ${reactivateEligibleCount} ${
              reactivateEligibleCount === 1 ? "członka" : "członków"
            }?`}
            confirmLabel={`Przywróć (${reactivateEligibleCount})`}
            membershipIds={bulkTargetIds}
            action={bulkReactivateMembers}
            onClose={() => setBulkDialog(null)}
            onComplete={handleBulkComplete}
          />

          <BulkMemberActionDialog
            open={bulkDialog === "remove"}
            title="UWAGA"
            description={`Usuniesz ${removeEligibleCount} ${
              removeEligibleCount === 1 ? "członka" : "członków"
            } z klubu.\n\nProfil użytkownika pozostanie w systemie.\n\nTej operacji nie można cofnąć.`}
            confirmLabel={
              removeEligibleCount === 1
                ? "Usuń 1 członka"
                : `Usuń ${removeEligibleCount} członków`
            }
            membershipIds={bulkTargetIds}
            action={bulkRemoveMembers}
            onClose={() => setBulkDialog(null)}
            onComplete={handleBulkComplete}
            tone="danger"
            requireIrreversibleAck
          />

          <BulkMemberActionDialog
            open={bulkDialog === "role"}
            title="Zmień rolę zaznaczonych członków"
            description={`Czy na pewno chcesz zmienić rolę ${roleChangeEligibleCount} ${
              roleChangeEligibleCount === 1 ? "członka" : "członków"
            }?`}
            confirmLabel={`Zmień rolę dla ${roleChangeEligibleCount} ${
              roleChangeEligibleCount === 1 ? "członka" : "członków"
            }`}
            membershipIds={bulkTargetIds}
            action={bulkChangeMemberRoles}
            onClose={() => setBulkDialog(null)}
            onComplete={handleBulkComplete}
            extraFields={
              <label className="block space-y-1.5">
                <span className="text-white/80">Nowa rola:</span>
                <select
                  name="role"
                  value={bulkRoleTarget}
                  onChange={(event) => setBulkRoleTarget(event.target.value as ClubRole)}
                  className="border-input min-h-[44px] w-full rounded-md border bg-background px-3 text-foreground"
                  required
                >
                  {assignableRoles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
              </label>
            }
          />

          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="w-10 px-3 py-3">
                    <input
                      ref={selectAllRef}
                      type="checkbox"
                      className="h-4 w-4 rounded border-input"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      aria-label="Zaznacz wszystkich członków"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">Imię i nazwisko</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rola</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Data dołączenia</th>
                  {canManage ? <th className="px-4 py-3 font-medium text-right">Akcje</th> : null}
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b last:border-b-0">
                    <td className="w-10 px-3 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={selectedIds.has(member.id)}
                        onChange={() => toggleMemberSelection(member.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Zaznacz ${member.profile?.full_name ?? member.profile?.email ?? "członka"}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {member.profile?.full_name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {member.profile?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{ROLE_LABELS[member.role]}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant(member.status)}>
                        {MEMBERSHIP_STATUS_LABELS[member.status] ?? member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatJoinDate(member.created_at)}
                    </td>
                    {canManage ? (
                      <td className="px-4 py-3 text-right">
                        <MemberRowActions
                          member={member}
                          actorRoles={actorRoles}
                          assignableRoles={assignableRoles}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
