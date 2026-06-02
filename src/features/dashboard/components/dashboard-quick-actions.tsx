import Link from "next/link";
import { CalendarPlus, ClipboardCheck, MessageSquare, Trophy } from "lucide-react";

import {
  canManageMatches,
  canManageTrainings,
  canMarkTrainingAttendance,
  canManageCommunication,
  canPublishCommunication,
} from "@/config/permissions";
import type { ClubRole } from "@/types/rbac";
import { cn } from "@/lib/utils";

const PRIORITY_ACTIONS = [
  {
    id: "add-training",
    label: "Dodaj trening",
    href: "/training/new",
    icon: CalendarPlus,
    can: (roles: ClubRole[]) => canManageTrainings(roles),
  },
  {
    id: "send-message",
    label: "Wyślij komunikat",
    href: "/communication/coach",
    icon: MessageSquare,
    can: (roles: ClubRole[]) => canManageCommunication(roles) || canPublishCommunication(roles),
  },
  {
    id: "add-match",
    label: "Dodaj mecz",
    href: "/matches/new",
    icon: Trophy,
    can: (roles: ClubRole[]) => canManageMatches(roles),
  },
  {
    id: "check-attendance",
    label: "Sprawdź obecności",
    href: "/attendance",
    icon: ClipboardCheck,
    can: (roles: ClubRole[]) => canMarkTrainingAttendance(roles),
  },
] as const;

export function DashboardQuickActions({ roles }: { roles: ClubRole[] }) {
  const actions = PRIORITY_ACTIONS.filter((action) => action.can(roles));
  if (actions.length === 0) return null;

  return (
    <section aria-label="Szybkie akcje">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Szybkie akcje
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              href={action.href}
              className={cn(
                "flex min-h-[88px] flex-col justify-between rounded-xl border-2 border-primary/20",
                "bg-primary p-4 text-primary-foreground shadow-sm transition",
                "hover:border-[var(--club-secondary,#F4C430)] hover:shadow-md active:scale-[0.98]",
              )}
            >
              <Icon className="size-6 text-[var(--club-secondary,#F4C430)]" />
              <span className="text-sm font-semibold leading-snug">{action.label}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
