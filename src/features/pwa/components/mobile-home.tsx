"use client";

import Link from "next/link";

import {
  getQuickActionsForRoles,
  MOBILE_DASHBOARD_COPY,
  resolveMobileDashboardVariant,
} from "@/lib/pwa/quick-actions";
import type { ClubRole } from "@/types/rbac";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MobileQuickActions({ roles }: { roles: ClubRole[] }) {
  const actions = getQuickActionsForRoles(roles);
  if (actions.length === 0) return null;

  return (
    <section className="md:hidden">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Szybkie akcje
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                buttonVariants({ variant: "outline" }),
                "h-auto min-h-[72px] flex-col gap-2 py-3 text-center text-xs",
              )}
            >
              <Icon className="size-5 shrink-0" />
              <span>{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function MobileRoleHeader({ roles }: { roles: ClubRole[] }) {
  const variant = resolveMobileDashboardVariant(roles);
  const copy = MOBILE_DASHBOARD_COPY[variant];

  return (
    <div className="rounded-xl border bg-gradient-to-br from-[var(--pwa-primary,#0B3D2E)] to-[#062820] p-4 text-white md:hidden">
      <p className="text-xs font-medium uppercase tracking-wide text-white/70">Football Club OS</p>
      <h2 className="mt-1 text-lg font-semibold">{copy.title}</h2>
      <p className="mt-1 text-sm text-white/80">{copy.subtitle}</p>
    </div>
  );
}
