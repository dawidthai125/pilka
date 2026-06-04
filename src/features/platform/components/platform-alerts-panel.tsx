"use client";

import type { PlatformAlert, PlatformAlertSeverity } from "@/lib/platform/platform-alerts";
import { summarizePlatformAlerts } from "@/lib/platform/platform-alerts";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<PlatformAlertSeverity, string> = {
  CRITICAL: "bg-red-500/15 text-red-200 ring-red-500/30",
  WARNING: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  INFO: "bg-sky-500/15 text-sky-200 ring-sky-500/30",
};

function AlertSeverityBadge({ severity }: { severity: PlatformAlertSeverity }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset",
        SEVERITY_STYLES[severity],
      )}
    >
      {severity}
    </span>
  );
}

type PlatformAlertsPanelProps = {
  alerts: PlatformAlert[];
  onAlertSelect: (alert: PlatformAlert) => void;
};

export function PlatformAlertsPanel({ alerts, onAlertSelect }: PlatformAlertsPanelProps) {
  const summary = summarizePlatformAlerts(alerts);

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Platform Alerts</h2>
        <p className="text-xs text-white/40">Kliknij alert → filtry Sync History</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-center text-sm sm:max-w-md">
        <div>
          <dt className="text-xs uppercase tracking-wide text-red-200/70">CRITICAL</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-red-100">{summary.critical}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-amber-200/70">WARNING</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-amber-100">{summary.warning}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-sky-200/70">INFO</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-sky-100">{summary.info}</dd>
        </div>
      </dl>

      {alerts.length === 0 ? (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/25 px-4 py-4 text-sm text-emerald-100/90">
          <p className="font-medium">Brak aktywnych alertów.</p>
          <p className="mt-1 text-emerald-100/75">
            Wszystkie monitorowane synchronizacje działają poprawnie w bieżącym oknie metryk (7 dni).
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert) => (
            <li
              key={`${alert.priorityGroup}:${alert.type}:${alert.clubId ?? "p"}:${alert.sourceId ?? ""}:${alert.title}`}
            >
              <button
                type="button"
                onClick={() => onAlertSelect(alert)}
                className={cn(
                  "w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm transition-colors hover:bg-white/10",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500/50",
                )}
              >
                <div className="flex flex-wrap items-start gap-2">
                  <AlertSeverityBadge severity={alert.severity} />
                  <span className="min-w-0 flex-1 font-medium text-white">{alert.title}</span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-white/60">{alert.description}</p>
                {alert.factors.length > 0 ? (
                  <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-white/50">
                    {alert.factors.map((factor) => (
                      <li key={factor}>{factor}</li>
                    ))}
                  </ul>
                ) : null}
                <p className="mt-2 text-xs text-amber-200/70">{alert.checkHint}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
