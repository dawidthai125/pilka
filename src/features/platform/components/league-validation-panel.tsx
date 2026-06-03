import type { LeagueValidationResult } from "@/lib/platform/league-config-validation";
import { cn } from "@/lib/utils";

const VERDICT_STYLES = {
  PASS: "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  WARNING: "bg-amber-500/20 text-amber-200 border-amber-500/30",
  FAIL: "bg-red-500/20 text-red-200 border-red-500/30",
};

const SEVERITY_ICON = {
  pass: "✓",
  warning: "⚠",
  fail: "✕",
};

export function ValidationResultsPanel({ validation }: { validation: LeagueValidationResult }) {
  return (
    <div className="space-y-3">
      <div className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide", VERDICT_STYLES[validation.verdict])}>
        {validation.verdict}
      </div>
      <ul className="space-y-1 text-sm">
        {validation.checks.map((check) => (
          <li
            key={check.code}
            className={cn(
              "flex gap-2 rounded px-2 py-1",
              check.severity === "fail" && "text-red-200",
              check.severity === "warning" && "text-amber-200",
              check.severity === "pass" && "text-white/70",
            )}
          >
            <span className="shrink-0">{SEVERITY_ICON[check.severity]}</span>
            <span>{check.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
