import { ParentFinancePortal } from "@/features/finance/components/parent-finance-portal";
import {
  getDashboardContext,
  getParentFinancePortalData,
  requireFinancePortalAccess,
} from "@/lib/auth/session";

export default async function FinancePortalPage() {
  const { access } = await getDashboardContext();
  requireFinancePortalAccess(access);
  const data = await getParentFinancePortalData(access.clubId);

  if (!data) {
    return (
      <div className="rounded-xl border p-6 text-center text-muted-foreground">
        Brak powiązanego zawodnika. Skontaktuj się z klubem.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Moje składki</h1>
        <p className="text-sm text-muted-foreground">Panel rodzica — wyłącznie dane Twojego zawodnika</p>
      </div>
      <ParentFinancePortal data={data} />
    </div>
  );
}
