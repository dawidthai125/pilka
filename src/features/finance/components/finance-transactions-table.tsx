import {
  FINANCE_EXPENSE_CATEGORY_LABELS,
  FINANCE_INCOME_CATEGORY_LABELS,
  formatMoney,
} from "@/lib/finance/constants";
import type { FinanceExpense, FinanceIncome } from "@/types/finance";

type Props = {
  type: "income" | "expense";
  items: FinanceIncome[] | FinanceExpense[];
};

export function FinanceTransactionsTable({ type, items }: Props) {
  const labels =
    type === "income" ? FINANCE_INCOME_CATEGORY_LABELS : FINANCE_EXPENSE_CATEGORY_LABELS;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Kwota</th>
            <th className="px-4 py-3 font-medium">Opis</th>
            <th className="px-4 py-3 font-medium">Kategoria</th>
            <th className="px-4 py-3 font-medium">Dodał</th>
          </tr>
        </thead>
        <tbody>
          {items.length ? (
            items.map((item) => (
              <tr key={item.id} className="border-b last:border-0">
                <td className="px-4 py-3">{item.transactionDate}</td>
                <td className="px-4 py-3 font-medium">{formatMoney(item.amount)}</td>
                <td className="px-4 py-3">{item.description}</td>
                <td className="px-4 py-3">{labels[item.category as keyof typeof labels]}</td>
                <td className="px-4 py-3 text-muted-foreground">{item.createdByName ?? "—"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                Brak operacji.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
