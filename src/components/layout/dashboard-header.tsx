import Link from "next/link";

import { MobileDashboardNav } from "@/components/layout/mobile-dashboard-nav";
import { getRoleLabels } from "@/lib/auth/session";
import type { Profile } from "@/types/rbac";
import type { ClubRole } from "@/types/rbac";
import { SignOutButton } from "@/features/auth/components/sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function initials(name: string | null | undefined, email: string) {
  if (name) {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  return email.slice(0, 2).toUpperCase();
}

export function DashboardHeader({
  profile,
  roles,
  clubName,
  appName,
}: {
  profile: Profile | null;
  roles: ClubRole[];
  clubName: string;
  appName: string;
}) {
  const email = profile?.email ?? "";
  const name = profile?.fullName ?? email;

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileDashboardNav appName={appName} clubName={clubName} />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Klub</p>
          <p className="truncate font-semibold">{clubName}</p>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Menu użytkownika"
        >
          <div className="flex items-center gap-3 rounded-lg px-2 py-1 hover:bg-muted">
            <Avatar className="size-8">
              <AvatarFallback>{initials(profile?.fullName, email)}</AvatarFallback>
            </Avatar>
            <span className="hidden max-w-40 text-left sm:block">
              <span className="block truncate text-sm font-medium">{name}</span>
              <span className="block truncate text-xs text-muted-foreground">
                {getRoleLabels(roles).join(", ")}
              </span>
            </span>
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Moje konto</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Link href="/profile">Profil użytkownika</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="p-0">
            <SignOutButton />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
