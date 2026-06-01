import { AppSettingsForm } from "@/features/pwa/components/app-settings-form";
import { getNotificationPreferences } from "@/features/pwa/actions";
import { getDashboardContext } from "@/lib/auth/session";

export default async function SettingsPage() {
  await getDashboardContext();
  const preferences = await getNotificationPreferences();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ustawienia aplikacji</h1>
        <p className="text-sm text-muted-foreground">
          Motyw, język i preferencje powiadomień PWA.
        </p>
      </div>
      <AppSettingsForm preferences={preferences} />
    </div>
  );
}
