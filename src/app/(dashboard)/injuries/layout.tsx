import { InjurySubNav } from "@/features/injuries/components/injury-sub-nav";
import { getDashboardContext } from "@/lib/auth/session";
import { INJURY_MODULE_DISCLAIMER } from "@/lib/injuries/constants";

export default async function InjuriesLayout({ children }: { children: React.ReactNode }) {
  const { access } = await getDashboardContext();

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-semibold">Injury & Medical</h1>
        <p className="text-sm text-muted-foreground">
          Zarządzanie dostępnością sportową zawodników — {INJURY_MODULE_DISCLAIMER.toLowerCase()}
        </p>
      </div>
      <InjurySubNav roles={access.roles} />
      {children}
    </div>
  );
}
