"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { PUBLIC_NAV_LINKS } from "@/lib/website/constants";
import { cn } from "@/lib/utils";

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : href.startsWith("/#") ? false : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 px-3 py-2 text-sm font-semibold transition",
        isActive ? "text-[var(--club-secondary)]" : "text-white/85 hover:text-white",
      )}
    >
      {label}
    </Link>
  );
}

export function PublicClubNav({ variant }: { variant: "desktop" | "mobile" }) {
  if (variant === "desktop") {
    return (
      <nav className="hidden flex-1 items-center justify-center gap-0 overflow-x-auto lg:flex" aria-label="Nawigacja główna">
        <NavLink href="/" label="Start" />
        {PUBLIC_NAV_LINKS.map((link) => (
          <NavLink key={link.href} href={link.href} label={link.label} />
        ))}
      </nav>
    );
  }

  return (
    <nav className="flex gap-0 overflow-x-auto border-t border-white/10 px-2 pb-1 lg:hidden" aria-label="Nawigacja mobilna">
      <NavLink href="/" label="Start" />
      {PUBLIC_NAV_LINKS.map((link) => (
        <NavLink key={link.href} href={link.href} label={link.label} />
      ))}
    </nav>
  );
}
