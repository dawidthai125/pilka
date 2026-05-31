import { FinanceDocumentsPanel } from "@/features/finance/components/finance-documents-panel";
import { canManageFinance } from "@/config/permissions";
import { getDashboardContext, getFinanceDocuments, requireFinanceReadAccess } from "@/lib/auth/session";

export default async function FinanceDocumentsPage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const documents = await getFinanceDocuments(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Faktury i dokumenty</h1>
      <FinanceDocumentsPanel documents={documents} canManage={canManageFinance(access.roles)} />
    </div>
  );
}
