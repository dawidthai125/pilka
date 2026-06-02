import Link from "next/link";
import { Bell, ExternalLink, Search } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
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
  logoUrl,
  unreadNotifications = 0,
}: {
  profile: Profile | null;
  roles: ClubRole[];
  clubName: string;
  logoUrl?: string | null;
  unreadNotifications?: number;
}) {
  const email = profile?.email ?? "";
  const name = profile?.fullName ?? email;

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#041810]/95 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <MobileDashboardNav clubName={clubName} logoUrl={logoUrl} roles={roles} />
          <ClubLogo logoUrl={logoUrl} clubName={clubName} size="sm" className="hidden md:flex" />
          <div className="hidden min-w-0 lg:block">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--club-secondary)]">
              Panel klubowy
            </p>
            <p className="truncate text-sm font-semibold text-white">{clubName}</p>
          </div>
        </div>

        <div className="hidden max-w-md flex-1 md:flex">
          <label className="relative w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <input
              type="search"
              placeholder="Szukaj zawodników, meczów, treningów…"
              className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-[var(--club-secondary)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--club-secondary)]/30"
              readOnly
              aria-label="Szukaj w panelu"
            />
          </label>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/"
            target="_blank"
            className="hidden rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white sm:inline-flex"
            aria-label="Strona publiczna klubu"
          >
            <ExternalLink className="size-5" />
          </Link>
          <Link
            href="/notifications"
            className="relative rounded-lg p-2 text-white/80 hover:bg-white/10 hover:text-white"
            aria-label="Centrum powiadomień"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 ? (
              <Badge className="absolute -top-0.5 -right-0.5 size-5 justify-center rounded-full border-0 bg-[var(--club-secondary)] p-0 text-[10px] text-[var(--club-primary)]">
                {unreadNotifications > 9 ? "9+" : unreadNotifications}
              </Badge>
            ) : null}
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger
              className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--club-secondary)]"
              aria-label="Menu użytkownika"
            >
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1 hover:bg-white/10 sm:gap-3 sm:px-3">
                <Avatar className="size-8 ring-2 ring-[var(--club-secondary)]/40">
                  <AvatarFallback className="bg-[var(--club-primary)] text-xs text-white">
                    {initials(profile?.fullName, email)}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden max-w-36 text-left sm:block">
                  <span className="block truncate text-sm font-medium text-white">{name}</span>
                  <span className="block truncate text-[11px] text-white/55">
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
              <DropdownMenuItem render={<Link href="/profile" />}>Profil użytkownika</DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/notifications" />}>Powiadomienia</DropdownMenuItem>
              <DropdownMenuSeparator />
              <SignOutMenuItem />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
