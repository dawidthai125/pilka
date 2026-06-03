import { cn } from "@/lib/utils";
import type { OnboardingStepStatus } from "@/lib/platform/onboarding-status";

const LABELS: Record<OnboardingStepStatus, string> = {
  not_started: "Nie rozpoczęto",
  in_progress: "W toku",
  complete: "Gotowe",
};

const STYLES: Record<OnboardingStepStatus, string> = {
  not_started: "bg-white/10 text-white/50",
  in_progress: "bg-amber-500/20 text-amber-200",
  complete: "bg-emerald-500/20 text-emerald-200",
};

export function OnboardingStatusBadge({ status }: { status: OnboardingStepStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide", STYLES[status])}>
      {LABELS[status]}
    </span>
  );
}

export function OnboardingStatusGrid({
  onboarding,
}: {
  onboarding: {
    branding: OnboardingStepStatus;
    website: OnboardingStepStatus;
    league: OnboardingStepStatus;
    owner: OnboardingStepStatus;
    media: OnboardingStepStatus;
    overall: OnboardingStepStatus;
  };
}) {
  const rows = [
    ["Branding", onboarding.branding],
    ["Strona WWW", onboarding.website],
    ["Liga", onboarding.league],
    ["Właściciel", onboarding.owner],
    ["Media", onboarding.media],
  ] as const;

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([label, status]) => (
        <div key={label} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <span className="text-white/80">{label}</span>
          <OnboardingStatusBadge status={status} />
        </div>
      ))}
    </div>
  );
}
