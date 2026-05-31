"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  createFinanceFeePlan,
  createFinancePlayerFee,
  recordFinanceFeePayment,
} from "@/features/finance/actions";
import {
  FINANCE_FEE_PLAN_TYPE_LABELS,
  feeStatusLabel,
  feeStatusVariant,
  formatMoney,
} from "@/lib/finance/constants";
import type { FinanceFeePlan, FinancePlayerFee } from "@/types/finance";
import type { Player } from "@/types/players";

export function FinanceFeesPanel({
  feePlans,
  fees,
  players,
  canManage,
}: {
  feePlans: FinanceFeePlan[];
  fees: FinancePlayerFee[];
  players: Player[];
  canManage: boolean;
}) {
  const [planState, planAction, planPending] = useActionState(createFinanceFeePlan, {});
  const [feeState, feeAction, feePending] = useActionState(createFinancePlayerFee, {});
  const [payState, payAction, payPending] = useActionState(recordFinanceFeePayment, {});

  return (
    <div className="space-y-6">
      {canManage ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <form action={planAction} className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Nowy plan składki</h2>
            <input name="name" placeholder="Nazwa" required className="border-input min-h-[44px] w-full rounded-md border px-3" />
            <select name="feeType" className="border-input min-h-[44px] w-full rounded-md border px-3">
              {Object.entries(FINANCE_FEE_PLAN_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <input name="amount" type="number" step="0.01" placeholder="Kwota" required className="border-input min-h-[44px] w-full rounded-md border px-3" />
            <Button type="submit" disabled={planPending}>Utwórz plan</Button>
            {planState.error ? <p className="text-sm text-destructive">{planState.error}</p> : null}
            {planState.success ? <p className="text-sm text-green-600">{planState.success}</p> : null}
          </form>

          <form action={feeAction} className="space-y-3 rounded-xl border bg-card p-4">
            <h2 className="font-semibold">Nalicz składkę</h2>
            <select name="playerId" required className="border-input min-h-[44px] w-full rounded-md border px-3">
              <option value="">Wybierz zawodnika</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            <select name="feePlanId" className="border-input min-h-[44px] w-full rounded-md border px-3">
              <option value="">Bez planu</option>
              {feePlans.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input name="name" placeholder="Nazwa składki" required className="border-input min-h-[44px] w-full rounded-md border px-3" />
            <input name="amount" type="number" step="0.01" placeholder="Kwota" required className="border-input min-h-[44px] w-full rounded-md border px-3" />
            <input name="dueDate" type="date" required className="border-input min-h-[44px] w-full rounded-md border px-3" />
            <Button type="submit" disabled={feePending}>Nalicz</Button>
            {feeState.error ? <p className="text-sm text-destructive">{feeState.error}</p> : null}
          </form>
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="px-4 py-3">Zawodnik</th>
              <th className="px-4 py-3">Składka</th>
              <th className="px-4 py-3">Termin</th>
              <th className="px-4 py-3">Kwota</th>
              <th className="px-4 py-3">Status</th>
              {canManage ? <th className="px-4 py-3">Wpłata</th> : null}
            </tr>
          </thead>
          <tbody>
            {fees.map((fee) => (
              <tr key={fee.id} className="border-b last:border-0">
                <td className="px-4 py-3">{fee.playerName ?? "—"}</td>
                <td className="px-4 py-3">{fee.name}</td>
                <td className="px-4 py-3">{fee.dueDate}</td>
                <td className="px-4 py-3">
                  {formatMoney(fee.amountPaid)} / {formatMoney(fee.amountDue)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={feeStatusVariant(fee.status, fee.dueDate)}>
                    {feeStatusLabel(fee.status, fee.dueDate, fee.amountPaid, fee.amountDue)}
                  </Badge>
                </td>
                {canManage ? (
                  <td className="px-4 py-3">
                    {fee.status !== "paid" ? (
                      <form action={payAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="playerFeeId" value={fee.id} />
                        <input name="amount" type="number" step="0.01" placeholder="Kwota" required className="border-input min-h-[44px] w-28 rounded-md border px-2" />
                        <Button type="submit" size="sm" disabled={payPending} className="min-h-[44px]">Zapisz</Button>
                      </form>
                    ) : "—"}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {payState.success ? <p className="text-sm text-green-600">{payState.success}</p> : null}
    </div>
  );
}
