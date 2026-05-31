import { getDashboardContext } from "@/lib/auth/session";
import { ClubProfileForm } from "@/features/club/components/club-profile-form";

export default async function ClubPage() {
  const { access, club } = await getDashboardContext();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Profil klubu</h1>
        <p className="text-sm text-muted-foreground">
          Dane klubu {club.publicName} w systemie Football Club OS.
        </p>
      </div>
      <ClubProfileForm club={club} roles={access.roles} />
    </div>
  );
}
