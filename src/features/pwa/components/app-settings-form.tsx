"use client";

import { useActionState, useEffect, useState } from "react";

import { saveNotificationPreferences, type PwaSettingsState } from "@/features/pwa/actions";
import { useTheme, type ThemeMode } from "@/components/pwa/theme-provider";
import { Button } from "@/components/ui/button";
import { isPushSupported, subscribeToPush, unsubscribeFromPush } from "@/lib/pwa/push-client";
import { getStoredLocale, setStoredLocale, t, type AppLocale } from "@/lib/pwa/i18n";

const EVENT_LABELS: Record<string, string> = {
  training_tomorrow: "Trening jutro",
  match_tomorrow: "Mecz jutro",
  schedule_change: "Zmiana terminu",
  document_expiring: "Wygasający dokument",
  fee_overdue: "Zaległa składka",
  ai_report_new: "Nowy raport AI",
  general: "Ogólne",
};

export function AppSettingsForm({
  preferences,
}: {
  preferences: Array<{
    event_type: string;
    push_enabled: boolean;
    in_app_enabled: boolean;
  }>;
}) {
  const { theme, setTheme } = useTheme();
  const [locale, setLocale] = useState<AppLocale>("pl");
  const [pushEnabled, setPushEnabled] = useState(false);
  const [state, action, pending] = useActionState(saveNotificationPreferences, {} as PwaSettingsState);

  useEffect(() => {
    setLocale(getStoredLocale());
  }, []);

  const prefMap = new Map(preferences.map((p) => [p.event_type, p]));

  return (
    <div className="space-y-8">
      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">{t("settings.theme", locale)}</h2>
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
            <Button
              key={mode}
              type="button"
              size="sm"
              variant={theme === mode ? "default" : "outline"}
              onClick={() => setTheme(mode)}
            >
              {mode === "light" ? "Jasny" : mode === "dark" ? "Ciemny" : "Systemowy"}
            </Button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-xl border p-4">
        <h2 className="font-semibold">{t("settings.language", locale)}</h2>
        <div className="flex flex-wrap gap-2">
          {(["pl", "en"] as AppLocale[]).map((code) => (
            <Button
              key={code}
              type="button"
              size="sm"
              variant={locale === code ? "default" : "outline"}
              onClick={() => {
                setStoredLocale(code);
                setLocale(code);
              }}
            >
              {code === "pl" ? "Polski" : "English"}
            </Button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Architektura i18n gotowa — pełne tłumaczenia modułów w kolejnych iteracjach.
        </p>
      </section>

      {isPushSupported() ? (
        <section className="space-y-3 rounded-xl border p-4">
          <h2 className="font-semibold">Powiadomienia push</h2>
          <Button
            type="button"
            variant={pushEnabled ? "outline" : "default"}
            onClick={() => {
              void (pushEnabled ? unsubscribeFromPush() : subscribeToPush()).then((ok) => {
                if (!pushEnabled && ok) setPushEnabled(true);
                if (pushEnabled) setPushEnabled(false);
              });
            }}
          >
            {pushEnabled ? "Wyłącz push" : "Włącz powiadomienia push"}
          </Button>
        </section>
      ) : null}

      <form action={action} className="space-y-4 rounded-xl border p-4">
        <h2 className="font-semibold">{t("settings.notifications", locale)}</h2>
        <div className="space-y-3">
          {Object.entries(EVENT_LABELS).map(([eventType, label]) => {
            const pref = prefMap.get(eventType);
            return (
              <label key={eventType} className="flex items-center justify-between gap-4 text-sm">
                <span>{label}</span>
                <span className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Push</span>
                  <input
                    type="checkbox"
                    name={`push_${eventType}`}
                    defaultChecked={pref?.push_enabled ?? true}
                  />
                  <span className="text-xs text-muted-foreground">In-app</span>
                  <input
                    type="checkbox"
                    name={`inapp_${eventType}`}
                    defaultChecked={pref?.in_app_enabled ?? true}
                  />
                </span>
              </label>
            );
          })}
        </div>
        {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        <Button type="submit" disabled={pending}>
          Zapisz preferencje
        </Button>
      </form>
    </div>
  );
}
