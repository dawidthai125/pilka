"use client";

import { useActionState } from "react";

import { createCrmEventAction, recordCrmDonationAction, type CrmActionState } from "@/features/crm/actions";
import { CRM_EVENT_TYPE_LABELS } from "@/types/crm";
import type { CrmDonationRow, CrmEventRow } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initial: CrmActionState = {};
const selectClass = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function CrmDonationsPanel({
  donations,
  canManage,
}: {
  donations: CrmDonationRow[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(recordCrmDonationAction, initial);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">Data</th>
              <th className="py-2">Kwota</th>
              <th className="py-2">Źródło</th>
              <th className="py-2">Cel</th>
              <th className="py-2">Kontakt</th>
            </tr>
          </thead>
          <tbody>
            {donations.map((d) => (
              <tr key={d.id} className="border-b">
                <td className="py-2">{new Date(d.donatedAt).toLocaleDateString("pl-PL")}</td>
                <td className="py-2 font-medium">
                  {d.amount.toLocaleString("pl-PL")} {d.currency}
                </td>
                <td className="py-2">{d.source ?? "—"}</td>
                <td className="py-2">{d.purpose ?? "—"}</td>
                <td className="py-2">{d.contactName ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nowa darowizna</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-3">
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Kwota (PLN)</Label>
                  <Input id="amount" name="amount" type="number" min="0" step="0.01" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="donatedAt">Data</Label>
                  <Input id="donatedAt" name="donatedAt" type="date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="source">Źródło</Label>
                  <Input id="source" name="source" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="purpose">Cel</Label>
                  <Input id="purpose" name="purpose" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="syncFinance" defaultChecked />
                Zapisz również w module Finance (kategoria: darowizny)
              </label>
              <Button type="submit" disabled={pending}>
                Zarejestruj darowiznę
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function CrmEventsPanel({
  events,
  canManage,
}: {
  events: CrmEventRow[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(createCrmEventAction, initial);

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{event.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>{CRM_EVENT_TYPE_LABELS[event.eventType]}</p>
              <p>{new Date(event.startsAt).toLocaleString("pl-PL")}</p>
              {event.location ? <p>{event.location}</p> : null}
              <p className="text-xs">Uczestnicy: {event.attendeeCount}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nowe wydarzenie</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-3">
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="eventType">Typ</Label>
                  <select id="eventType" name="eventType" className={selectClass} defaultValue="other">
                    {Object.entries(CRM_EVENT_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Start</Label>
                  <Input id="startsAt" name="startsAt" type="datetime-local" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł</Label>
                <Input id="title" name="title" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Miejsce</Label>
                <Input id="location" name="location" />
              </div>
              <Button type="submit" disabled={pending}>
                Utwórz wydarzenie
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
