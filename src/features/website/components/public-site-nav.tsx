"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { User } from "lucide-react";

import { PUBLIC_NAV_LINKS } from "@/lib/website/constants";
import { cn } from "@/lib/utils";

export function PublicSiteNav() {
  const pathname = usePathname();

  function isActive(href: string): boolean {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/#")) return false;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="sticky top-0 z-40 border-b border-black/5 bg-white shadow-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <nav className="flex gap-0 overflow-x-auto" aria-label="Nawigacja główna">
          <Link
            href="/"
            className={cn(
              "shrink-0 border-b-[3px] px-4 py-3.5 text-sm font-semibold transition",
              isActive("/")
                ? "border-[var(--club-primary)] text-[var(--club-primary)]"
                : "border-transparent text-muted-foreground hover:text-[var(--club-primary)]",
            )}
          >
            Start
          </Link>
          {PUBLIC_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "shrink-0 border-b-[3px] px-4 py-3.5 text-sm font-semibold transition",
                isActive(link.href)
                  ? "border-[var(--club-primary)] text-[var(--club-primary)]"
                  : "border-transparent text-muted-foreground hover:text-[var(--club-primary)]",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <Link
          href="/login"
          className="hidden shrink-0 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-[var(--club-primary)] sm:inline-flex"
        >
          <User className="size-4" />
          Panel klubu
        </Link>
      </div>
    </div>
  );
}
