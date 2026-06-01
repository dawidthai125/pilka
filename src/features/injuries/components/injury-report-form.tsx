"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";

import { reportInjuryAction, type InjuryActionState } from "@/features/injuries/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  INJURY_AVAILABILITY_IMPACTS,
  INJURY_AVAILABILITY_IMPACT_LABELS,
  INJURY_RECORD_STATUSES,
  INJURY_RECORD_STATUS_LABELS,
  type InjuryCategoryRow,
} from "@/types/injuries";
import { INJURY_MODULE_DISCLAIMER } from "@/lib/injuries/constants";

export function InjuryReportForm({
  players,
  categories,
}: {
  players: { id: string; name: string }[];
  categories: InjuryCategoryRow[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<InjuryActionState, FormData>(
    async (prev, formData) => {
      const result = await reportInjuryAction(prev, formData);
      if (result.injuryId) router.push(`/injuries/${result.injuryId}`);
      return result;
    },
    {},
  );

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <p className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
        {INJURY_MODULE_DISCLAIMER}
      </p>

      <div className="space-y-2">
        <Label htmlFor="playerId">Zawodnik</Label>
        <select
          id="playerId"
          name="playerId"
          required
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Wybierz zawodnika</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="injuryDate">Data zgłoszenia</Label>
          <Input id="injuryDate" name="injuryDate" type="date" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedReturnDate">Przewidywany powrót</Label>
          <Input id="expectedReturnDate" name="expectedReturnDate" type="date" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="categoryId">Rodzaj urazu</Label>
        <select
          id="categoryId"
          name="categoryId"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="injuryStatus">Status</Label>
          <select
            id="injuryStatus"
            name="injuryStatus"
            defaultValue="active"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {INJURY_RECORD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {INJURY_RECORD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="availabilityImpact">Wpływ na dostępność</Label>
          <select
            id="availabilityImpact"
            name="availabilityImpact"
            defaultValue="unavailable"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {INJURY_AVAILABILITY_IMPACTS.map((s) => (
              <option key={s} value={s}>
                {INJURY_AVAILABILITY_IMPACT_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Opis (sportowy, bez diagnozy medycznej)</Label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Zapisywanie…" : "Zgłoś uraz"}
      </Button>
    </form>
  );
}
