"use client";

import { useActionState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { activateClubAction, type PlatformActionState } from "@/features/platform/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClubActivationGateResult, GateVerdict } from "@/lib/platform/club-activation";
import { cn } from "@/lib/utils";

const initialState: PlatformActionState = {};

const VERDICT_LABEL: Record<GateVerdict, string> = {
  pass: "PASS",
  warning: "WARNING",
  fail: "FAIL",
};

const VERDICT_STYLE: Record<GateVerdict, string> = {
  pass: "bg-emerald-500/20 text-emerald-200",
  warning: "bg-amber-500/20 text-amber-200",
  fail: "bg-red-500/20 text-red-200",
};

function GateBadge({ verdict }: { verdict: GateVerdict }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        VERDICT_STYLE[verdict],
      )}
    >
      {VERDICT_LABEL[verdict]}
    </span>
  );
}

export function ClubActivationCard({ gates }: { gates: ClubActivationGateResult }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(activateClubAction, initialState);

  useEffect(() => {
    if (state.success) {
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <Card className="border-white/10 bg-white/5 text-white">
      <CardHeader>
        <CardTitle className="text-base">Aktywacja klubu publicznego</CardTitle>
        <CardDescription className="text-white/55">
          {gates.alreadyActive
            ? "Klub jest aktywny — strona publiczna i cron sync są dostępne."
            : "Po aktywacji klub będzie widoczny publicznie pod /" + gates.clubSlug}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {gates.gates.map((g) => (
            <div
              key={g.code}
              className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm"
            >
              <div>
                <span className="font-medium text-white/90">
                  {g.code} · {g.label}
                </span>
                <p className="mt-0.5 text-xs text-white/55">{g.message}</p>
              </div>
              <GateBadge verdict={g.verdict} />
            </div>
          ))}
        </div>

        {gates.warnings.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Ostrzeżenia</p>
            {gates.warnings.map((w) => (
              <div
                key={w.code}
                className="flex items-start justify-between gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-amber-100/90">
                    {w.code} · {w.label}
                  </span>
                  <p className="mt-0.5 text-xs text-amber-200/70">{w.message}</p>
                </div>
                <GateBadge verdict="warning" />
              </div>
            ))}
          </div>
        ) : null}

        {state.error ? <p className="text-sm text-red-300">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-300">{state.success}</p> : null}

        <div className="flex flex-wrap gap-3">
          {gates.alreadyActive ? (
            <Link
              href={`/${gates.clubSlug}`}
              target="_blank"
              className={buttonVariants({ className: "bg-emerald-600 hover:bg-emerald-500" })}
            >
              Otwórz stronę publiczną
            </Link>
          ) : gates.canActivate ? (
            <form action={action}>
              <input type="hidden" name="clubId" value={gates.clubId} />
              <Button type="submit" disabled={pending}>
                {pending ? "Aktywuję…" : "Aktywuj klub"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-white/50">
              Uzupełnij wymagane bramki (FAIL) przed aktywacją.{" "}
              <Link href={`/platform/clubs/${gates.clubId}/league/setup`} className="text-[var(--club-secondary,#F4C430)] underline">
                League Setup
              </Link>
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
