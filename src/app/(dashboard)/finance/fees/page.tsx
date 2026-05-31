import { FinanceFeesPanel } from "@/features/finance/components/finance-fees-panel";
import { canManageFinance } from "@/config/permissions";
import {
  getDashboardContext,
  getFinanceFeePlans,
  getFinancePlayerFees,
  getPlayers,
  requireFinanceReadAccess,
} from "@/lib/auth/session";

export default async function FinanceFeesPage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);

  const [feePlans, fees, players] = await Promise.all([
    getFinanceFeePlans(access.clubId),
    getFinancePlayerFees(access.clubId),
    getPlayers(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Składki zawodników</h1>
        <p className="text-sm text-muted-foreground">Plany składek i naliczenia</p>
      </div>
      <FinanceFeesPanel
        feePlans={feePlans}
        fees={fees}
        players={players}
        canManage={canManageFinance(access.roles)}
      />
    </div>
  );
}
