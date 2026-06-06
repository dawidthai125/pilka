"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  archiveClubAction,
  resendOwnerInviteAction,
  restoreClubAction,
  type PlatformActionState,
} from "@/features/platform/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ClubLifecycleRow = {
  id: string;
  slug: string;
  publicName: string;
  status: string;
  ownerEmail: string | null;
  ownerStatus: string | null;
};

function LifecycleConfirmButton({
  row,
  action,
  label,
  title,
  description,
  confirmLabel,
  tone = "default",
  variant = "inline",
}: {
  row: ClubLifecycleRow;
  action: (_prev: PlatformActionState, formData: FormData) => Promise<PlatformActionState>;
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger" | "restore";
  variant?: "inline" | "button";
}) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [state, formAction, pending] = useActionState(action, {} as PlatformActionState);

  useEffect(() => {
    if (state.success) {
      setConfirmOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  const inlineClass =
    tone === "danger"
      ? "text-red-300/90 hover:text-red-200"
      : tone === "restore"
        ? "text-emerald-300/90 hover:text-emerald-200"
        : "text-amber-300/90 hover:text-amber-200";

  const buttonClass =
    tone === "danger"
      ? "border-red-500/30 bg-red-950/40 text-red-200 hover:bg-red-900/50"
      : tone === "restore"
        ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-200 hover:bg-emerald-900/50"
        : "border-amber-500/30 bg-amber-950/40 text-amber-200 hover:bg-amber-900/50";

  return (
    <>
      {variant === "button" ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setConfirmOpen(true)}
          className={cn("border", buttonClass)}
        >
          {label}
        </Button>
      ) : (
        <button type="button" onClick={() => setConfirmOpen(true)} className={cn("text-xs hover:underline", inlineClass)}>
          {label}
        </button>
      )}
      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div
            className="max-w-md rounded-xl border border-white/15 bg-[#0a1410] p-5 text-sm text-white shadow-xl"
            role="dialog"
          >
            <h3 className="text-base font-semibold">{title}</h3>
            <p className="mt-2 text-white/65">{description}</p>
            {state.error ? <p className="mt-3 text-red-300">{state.error}</p> : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 bg-transparent text-white hover:bg-white/10"
                onClick={() => setConfirmOpen(false)}
                disabled={pending}
              >
                Anuluj
              </Button>
              <form action={formAction}>
                <input type="hidden" name="clubId" value={row.id} />
                <Button
                  type="submit"
                  disabled={pending}
                  className={cn(
                    tone === "danger" && "bg-red-700 hover:bg-red-600",
                    tone === "restore" && "bg-emerald-700 hover:bg-emerald-600",
                  )}
                >
                  {pending ? "…" : confirmLabel}
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function ArchiveClubButton({
  row,
  variant = "inline",
}: {
  row: ClubLifecycleRow;
  variant?: "inline" | "button";
}) {
  if (row.status !== "active") return null;

  return (
    <LifecycleConfirmButton
      row={row}
      action={archiveClubAction}
      label="Archiwizuj"
      title="Archiwizować klub?"
      description={`Klub ${row.publicName} (/${row.slug}) zostanie oznaczony jako archiwum. Strona publiczna i cron sync przestaną działać.`}
      confirmLabel="Archiwizuj"
      tone="danger"
      variant={variant}
    />
  );
}

export function RestoreClubButton({
  row,
  variant = "inline",
}: {
  row: ClubLifecycleRow;
  variant?: "inline" | "button";
}) {
  if (row.status !== "archived") return null;

  return (
    <LifecycleConfirmButton
      row={row}
      action={restoreClubAction}
      label="Przywróć"
      title="Przywrócić klub do onboardingu?"
      description={`Klub ${row.publicName} wróci do statusu onboarding (nie active). Operator musi ponownie przejść bramki aktywacji.`}
      confirmLabel="Przywróć"
      tone="restore"
      variant={variant}
    />
  );
}

export function ResendOwnerInviteButton({
  row,
  variant = "inline",
}: {
  row: ClubLifecycleRow;
  variant?: "inline" | "button";
}) {
  if (row.ownerStatus === "active") return null;

  return (
    <LifecycleConfirmButton
      row={row}
      action={resendOwnerInviteAction}
      label="Wyślij zaproszenie"
      title="Ponowić zaproszenie właściciela?"
      description={`Wyśle ponownie invite na ${row.ownerEmail ?? "email właściciela"} (Supabase Auth). Działa tylko gdy owner nie ma statusu active.`}
      confirmLabel="Wyślij"
      tone="default"
      variant={variant}
    />
  );
}

export function ClubLifecycleActionBar({
  row,
  variant = "button",
}: {
  row: ClubLifecycleRow;
  variant?: "inline" | "button";
}) {
  const hasAny =
    row.status === "active" ||
    row.status === "archived" ||
    (row.ownerStatus != null && row.ownerStatus !== "active");

  if (!hasAny) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <ArchiveClubButton row={row} variant={variant} />
      <RestoreClubButton row={row} variant={variant} />
      <ResendOwnerInviteButton row={row} variant={variant} />
    </div>
  );
}
