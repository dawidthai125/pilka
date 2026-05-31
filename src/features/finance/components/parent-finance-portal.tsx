import { Badge } from "@/components/ui/badge";
import {
  feeStatusLabel,
  feeStatusVariant,
  formatMoney,
} from "@/lib/finance/constants";
import type { ParentFinancePortalData } from "@/types/finance";

export function ParentFinancePortal({ data }: { data: ParentFinancePortalData }) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-4">
        <p className="text-sm text-muted-foreground">Zawodnik</p>
        <p className="text-xl font-semibold">{data.playerName}</p>
        <p className="mt-3 text-sm text-muted-foreground">Saldo do zapłaty</p>
        <p className="text-2xl font-semibold text-destructive">{formatMoney(data.balance)}</p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Należne składki</h2>
        <ul className="space-y-2">
          {data.fees.map((fee) => (
            <li key={fee.id} className="flex flex-col gap-2 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{fee.name}</p>
                <p className="text-sm text-muted-foreground">Termin: {fee.dueDate}</p>
              </div>
              <div className="flex items-center gap-3">
                <span>{formatMoney(fee.amountRemaining)} pozostało</span>
                <Badge variant={feeStatusVariant(fee.status, fee.dueDate)}>
                  {feeStatusLabel(fee.status, fee.dueDate, fee.amountPaid, fee.amountDue)}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Historia wpłat</h2>
        <ul className="space-y-2">
          {data.payments.length ? (
            data.payments.map((p) => (
              <li key={p.id} className="rounded-xl border p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span>{p.paymentDate}</span>
                  <span className="font-medium">{formatMoney(p.amount)}</span>
                </div>
                {p.note ? <p className="mt-1 text-muted-foreground">{p.note}</p> : null}
              </li>
            ))
          ) : (
            <li className="rounded-xl border p-4 text-sm text-muted-foreground">Brak wpłat.</li>
          )}
        </ul>
      </section>
    </div>
  );
}
