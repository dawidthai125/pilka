import Link from "next/link";

import { FinanceDashboardStats } from "@/features/finance/components/finance-dashboard-stats";
import { FinanceTransactionsTable } from "@/features/finance/components/finance-transactions-table";
import { canManageFinance } from "@/config/permissions";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getDashboardContext,
  getFinanceDashboardStats,
  requireFinanceReadAccess,
} from "@/lib/auth/session";
import { formatMoney } from "@/lib/finance/constants";

export default async function FinancePage() {
  const { access } = await getDashboardContext();
  requireFinanceReadAccess(access);
  const stats = await getFinanceDashboardStats(access.clubId);
  const canManage = canManageFinance(access.roles);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finanse klubu</h1>
          <p className="text-sm text-muted-foreground">Dashboard skarbnika — saldo {formatMoney(stats.balance)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/finance/income" className={cn(buttonVariants({ variant: "outline" }))}>Przychody</Link>
          <Link href="/finance/expenses" className={cn(buttonVariants({ variant: "outline" }))}>Koszty</Link>
          <Link href="/finance/fees" className={cn(buttonVariants({ variant: "outline" }))}>Składki</Link>
          <Link href="/finance/grants" className={cn(buttonVariants({ variant: "outline" }))}>Dotacje</Link>
          <Link href="/finance/budgets" className={cn(buttonVariants({ variant: "outline" }))}>Budżety</Link>
          <Link href="/finance/documents" className={cn(buttonVariants({ variant: "outline" }))}>Dokumenty</Link>
          <Link href="/finance/reports" className={cn(buttonVariants({ variant: "outline" }))}>Raporty</Link>
        </div>
      </div>

      <FinanceDashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Ostatnie wpływy</h2>
          <FinanceTransactionsTable type="income" items={stats.recentIncome} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Ostatnie wydatki</h2>
          <FinanceTransactionsTable type="expense" items={stats.recentExpenses} />
        </section>
      </div>

      {stats.overdueFees.length ? (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Zaległe składki ({stats.overdueFeesCount})</h2>
          <ul className="space-y-2">
            {stats.overdueFees.slice(0, 10).map((fee) => (
              <li key={fee.id} className="rounded-lg border px-4 py-3 text-sm">
                {fee.playerName} — {fee.name}: {formatMoney(fee.amountRemaining)} do zapłaty
              </li>
            ))}
          </ul>
          {canManage ? (
            <Link href="/finance/fees" className="mt-3 inline-block text-sm text-primary underline">
              Zarządzaj składkami
            </Link>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
