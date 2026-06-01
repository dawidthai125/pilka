import Link from "next/link";
import { Bell } from "lucide-react";

import { MobileDashboardNav } from "@/components/layout/mobile-dashboard-nav";
import { getRoleLabels } from "@/lib/auth/session";
import type { Profile } from "@/types/rbac";
import type { ClubRole } from "@/types/rbac";
import { SignOutMenuItem } from "@/features/auth/components/sign-out-button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  unreadNotifications = 0,
}: {
  profile: Profile | null;
  roles: ClubRole[];
  clubName: string;
  appName: string;
  unreadNotifications?: number;
}) {
  const email = profile?.email ?? "";
  const name = profile?.fullName ?? email;

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b px-4 md:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <MobileDashboardNav appName={appName} clubName={clubName} roles={roles} />
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Klub</p>
          <p className="truncate font-semibold">{clubName}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 hover:bg-muted"
          aria-label="Centrum powiadomień"
        >
          <Bell className="size-5" />
          {unreadNotifications > 0 ? (
            <Badge className="absolute -top-1 -right-1 size-5 justify-center rounded-full p-0 text-[10px]">
              {unreadNotifications > 9 ? "9+" : unreadNotifications}
            </Badge>
          ) : null}
        </Link>

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
            <DropdownMenuGroup>
              <DropdownMenuLabel>Moje konto</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profile" />}>
              Profil użytkownika
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/notifications" />}>
              Powiadomienia
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
