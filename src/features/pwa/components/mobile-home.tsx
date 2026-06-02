"use client";

import Link from "next/link";

import { ClubLogo } from "@/components/club/club-logo";
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

export function MobileRoleHeader({
  roles,
  clubName,
  logoUrl,
}: {
  roles: ClubRole[];
  clubName: string;
  logoUrl?: string | null;
}) {
  const variant = resolveMobileDashboardVariant(roles);
  const copy = MOBILE_DASHBOARD_COPY[variant];

  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--club-primary)_25%,transparent)] bg-gradient-to-br from-[var(--club-primary,var(--pwa-primary,#0B3D2E))] to-[#062820] p-4 text-white md:hidden">
      <div className="flex items-center gap-3">
        <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" onDark />
        <p className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium uppercase tracking-wide text-white/70">
            {clubName}
          </span>
          <span className="mt-1 block text-lg font-semibold">{copy.title}</span>
          <span className="mt-1 block text-sm text-white/80">{copy.subtitle}</span>
        </p>
      </div>
    </div>
  );
}
