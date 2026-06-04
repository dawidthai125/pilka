"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, Plus, Shield } from "lucide-react";

import { cn } from "@/lib/utils";

const links = [
  { href: "/platform", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/platform/clubs", label: "Kluby", icon: Building2, exact: false },
  { href: "/platform/clubs/new", label: "Nowy klub", icon: Plus, exact: true },
];

export function PlatformNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
              active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function PlatformShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#060d0a] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:flex-row lg:gap-10">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="mb-6 flex items-center gap-2 text-[var(--club-secondary,#F4C430)]">
            <Shield className="size-5" />
            <span className="text-sm font-bold uppercase tracking-widest">Platform</span>
          </div>
          <PlatformNav />
          <Link href="/dashboard" className="mt-6 block text-xs text-white/45 hover:text-white/70">
            ← Panel klubowy
          </Link>
        </aside>
        <main className="min-w-0 flex-1">
          <header className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm text-white/60">{subtitle}</p> : null}
          </header>
          {children}
        </main>
      </div>
    </div>
  );
}
