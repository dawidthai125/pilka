"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import {
  dashboardNavSections,
  type DashboardNavItem,
  type DashboardNavSection,
} from "@/config/navigation";
import { filterDashboardNavForRoles } from "@/lib/navigation/filter-dashboard-nav";
import { isDashboardNavItemActive } from "@/lib/navigation/nav-active";
import { cn } from "@/lib/utils";
import type { ClubRole } from "@/types/rbac";

function NavLink({
  item,
  pathname,
  variant,
  onNavigate,
}: {
  item: DashboardNavItem;
  pathname: string;
  variant: "default" | "sidebar";
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isDashboardNavItemActive(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
        variant === "sidebar"
          ? active
            ? "border-l-2 border-[var(--club-secondary)] bg-[var(--club-secondary)]/15 font-semibold text-[var(--club-secondary)] shadow-[inset_0_0_20px_rgba(244,196,48,0.08)]"
            : "border-l-2 border-transparent text-white/80 hover:border-white/10 hover:bg-white/5 hover:text-white"
          : active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.title}
    </Link>
  );
}

function NavSectionBlock({
  section,
  visibleItems,
  pathname,
  variant,
  onNavigate,
  forceOpen,
}: {
  section: DashboardNavSection;
  visibleItems: DashboardNavItem[];
  pathname: string;
  variant: "default" | "sidebar";
  onNavigate?: () => void;
  forceOpen?: boolean;
}) {
  const sectionActive = visibleItems.some((item) => isDashboardNavItemActive(pathname, item.href));
  const [open, setOpen] = useState(!section.defaultCollapsed || sectionActive);

  useEffect(() => {
    if (forceOpen || sectionActive) {
      setOpen(true);
    }
  }, [forceOpen, sectionActive]);

  if (visibleItems.length === 0) return null;

  const isPulpit = section.id === "pulpit";
  const isCollapsible = section.defaultCollapsed === true;

  if (isPulpit) {
    return (
      <div className="space-y-1">
        {visibleItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            variant={variant}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {isCollapsible ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest transition-colors",
            variant === "sidebar"
              ? "text-white/40 hover:bg-white/5 hover:text-white/60"
              : "text-muted-foreground hover:bg-muted",
          )}
          aria-expanded={open}
        >
          <span>{section.label}</span>
          <ChevronDown
            className={cn("size-3.5 shrink-0 transition-transform", open && "rotate-180")}
            aria-hidden
          />
        </button>
      ) : (
        <p
          className={cn(
            "px-3 py-2 text-[10px] font-bold uppercase tracking-widest",
            variant === "sidebar" ? "text-white/40" : "text-muted-foreground",
          )}
        >
          {section.label}
        </p>
      )}
      {(!isCollapsible || open) && (
        <div className="space-y-0.5">
          {visibleItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              variant={variant}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DashboardNav({
  roles,
  onNavigate,
  variant = "default",
}: {
  roles?: ClubRole[];
  onNavigate?: () => void;
  variant?: "default" | "sidebar";
}) {
  const pathname = usePathname();
  const visibleHrefs = useMemo(() => {
    if (!roles) return new Set(dashboardNavSections.flatMap((s) => s.items.map((i) => i.href)));
    return new Set(filterDashboardNavForRoles(roles).map((item) => item.href));
  }, [roles]);

  const sections = useMemo(() => {
    return dashboardNavSections
      .map((section) => ({
        section,
        items: section.items.filter((item) => visibleHrefs.has(item.href)),
      }))
      .filter(({ items }) => items.length > 0);
  }, [visibleHrefs]);

  return (
    <nav className="space-y-4">
      {sections.map(({ section, items }) => (
        <NavSectionBlock
          key={section.id}
          section={section}
          visibleItems={items}
          pathname={pathname}
          variant={variant}
          onNavigate={onNavigate}
        />
      ))}
    </nav>
  );
}
