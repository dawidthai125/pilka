import { cn } from "@/lib/utils";
import type { HealthLevel } from "@/lib/platform/health-types";
import type { SyncCategory } from "@/lib/platform/sync-category";

const HEALTH_STYLES: Record<HealthLevel, string> = {
  HEALTHY: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  WARNING: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  CRITICAL: "bg-red-500/15 text-red-200 ring-red-500/30",
};

const SYNC_STYLES: Record<SyncCategory, string> = {
  PASS: "bg-emerald-500/15 text-emerald-200 ring-emerald-500/30",
  WARNING: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  FAIL: "bg-red-500/15 text-red-200 ring-red-500/30",
};

export function HealthLevelBadge({ level }: { level: HealthLevel }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset",
        HEALTH_STYLES[level],
      )}
    >
      {level}
    </span>
  );
}

export function SyncCategoryBadge({ category }: { category: SyncCategory }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset",
        SYNC_STYLES[category],
      )}
    >
      {category}
    </span>
  );
}

export function formatPlatformDate(value: string) {
  if (value === "—") return value;
  return new Date(value).toLocaleString("pl-PL");
}
