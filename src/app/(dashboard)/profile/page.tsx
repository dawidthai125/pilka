import { getDashboardContext } from "@/lib/auth/session";
import { ProfileForm } from "@/features/auth/components/profile-form";

export default async function ProfilePage() {
  const { profile } = await getDashboardContext();

  if (!profile) {
    return <p className="text-sm text-muted-foreground">Nie znaleziono profilu.</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil użytkownika</h1>
        <p className="text-sm text-muted-foreground">Zarządzaj swoimi danymi.</p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  );
}
