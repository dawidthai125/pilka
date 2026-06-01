"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { LEAGUE_NAV } from "@/lib/league/constants";
import { cn } from "@/lib/utils";

export function LeagueSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-2" aria-label="Nawigacja League Hub">
      {LEAGUE_NAV.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition min-h-[44px] flex items-center",
            pathname === item.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
