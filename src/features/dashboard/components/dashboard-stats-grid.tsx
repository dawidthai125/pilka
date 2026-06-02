import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type StatItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  href?: string;
  icon: LucideIcon;
  accent?: "gold" | "green" | "default";
};

export function DashboardStatsGrid({
  items,
}: {
  items: StatItem[];
}) {
  if (items.length === 0) return null;

  return (
    <section aria-label="Statystyki klubu">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Operacje klubu
      </h2>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const content = (
            <div
              className={cn(
                "relative overflow-hidden rounded-xl border p-4 transition hover:shadow-md",
                item.href && "hover:border-primary/40",
                item.accent === "gold"
                  ? "border-[color-mix(in_srgb,var(--club-secondary)_35%,transparent)] bg-[color-mix(in_srgb,var(--club-secondary)_8%,transparent)]"
                  : item.accent === "green"
                    ? "border-[color-mix(in_srgb,var(--club-primary)_25%,transparent)] bg-[color-mix(in_srgb,var(--club-primary)_6%,transparent)]"
                    : "border-border bg-card",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    item.accent === "gold" ? "text-[var(--club-secondary,#F4C430)]" : "text-primary",
                  )}
                />
              </div>
              <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          );

          return item.href ? (
            <Link key={item.id} href={item.href} className="block min-h-[120px]">
              {content}
            </Link>
          ) : (
            <div key={item.id} className="min-h-[120px]">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export type { StatItem };
