import { CreateClubWizard } from "@/features/platform/components/create-club-wizard";
import { PlatformShell } from "@/features/platform/components/platform-shell";

export default function PlatformCreateClubPage() {
  return (
    <PlatformShell title="Nowy klub" subtitle="Kreator onboardingu — bez CLI i bootstrap-club.mjs.">
      <CreateClubWizard />
    </PlatformShell>
  );
}
