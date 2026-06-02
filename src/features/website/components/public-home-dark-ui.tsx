import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { CLUB_DISPLAY_CLASS, CLUB_SCENE_DARK } from "@/lib/website/constants";
import { cn } from "@/lib/utils";

const PITCH_PATTERN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='36' fill='none' stroke='white' stroke-width='1'/%3E%3Cpath d='M40 4 L48 28 L72 28 L52 44 L60 68 L40 52 L20 68 L28 44 L8 28 L32 28 Z' fill='white' opacity='0.5'/%3E%3C/svg%3E")`;

export function HomeDarkSection({
  id,
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel = "Zobacz więcej",
  children,
  className,
  "aria-label": ariaLabel,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={cn(CLUB_SCENE_DARK, "relative overflow-hidden py-12 sm:py-16", className)}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: PITCH_PATTERN, backgroundSize: "80px 80px" }}
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        {title ? (
          <HomeDarkSectionHeader
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            href={href}
            linkLabel={linkLabel}
          />
        ) : null}
        {children}
      </div>
    </section>
  );
}

export function HomeDarkSectionHeader({
  eyebrow,
  title,
  subtitle,
  href,
  linkLabel = "Zobacz więcej",
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--club-secondary)]">{eyebrow}</p>
        ) : null}
        <h2 className={cn(CLUB_DISPLAY_CLASS, "mt-2 text-3xl font-bold text-white sm:text-4xl")}>{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-white/65">{subtitle}</p> : null}
      </div>
      {action ??
        (href ? (
          <Link
            href={href}
            className="inline-flex min-h-10 items-center gap-1 rounded-lg border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10"
          >
            {linkLabel}
            <ChevronRight className="size-4" />
          </Link>
        ) : null)}
    </div>
  );
}

export function HomeDarkPanel({
  children,
  className,
  padding = true,
}: {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm",
        padding && "p-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function HomeDarkPanelHeader({
  title,
  icon: Icon,
  href,
  linkLabel = "Pełna →",
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
      <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--club-secondary)]">
        {Icon ? <Icon className="size-4" /> : null}
        {title}
      </h3>
      {href ? (
        <Link href={href} className="text-[11px] font-medium text-white/60 hover:text-white">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function HomeDarkPrimaryButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[var(--club-secondary)] px-4 text-sm font-bold text-[var(--club-primary)]"
    >
      {children}
      <ChevronRight className="size-4" />
    </Link>
  );
}
