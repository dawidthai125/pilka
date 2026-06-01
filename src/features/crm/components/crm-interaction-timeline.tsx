"use client";

import { useActionState } from "react";

import { addCrmInteractionAction, type CrmActionState } from "@/features/crm/actions";
import { CRM_INTERACTION_TYPES, CRM_INTERACTION_TYPE_LABELS } from "@/types/crm";
import type { CrmInteractionRow } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initial: CrmActionState = {};
const selectClass = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";
const textareaClass = "border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm shadow-xs";

export function CrmInteractionTimeline({
  contactId,
  interactions,
  canManage,
}: {
  contactId: string;
  interactions: CrmInteractionRow[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(addCrmInteractionAction, initial);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Oś czasu relacji</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {interactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak interakcji.</p>
          ) : (
            <ol className="relative space-y-4 border-l pl-6">
              {interactions.map((item) => (
                <li key={item.id} className="relative">
                  <span className="bg-primary absolute -left-[1.35rem] top-1 size-2.5 rounded-full" />
                  <p className="text-sm font-medium">
                    {CRM_INTERACTION_TYPE_LABELS[item.interactionType]} — {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.occurredAt).toLocaleString("pl-PL")}
                  </p>
                  {item.body ? <p className="mt-1 text-sm">{item.body}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dodaj interakcję</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-3">
              <input type="hidden" name="contactId" value={contactId} />
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="interactionType">Typ</Label>
                  <select id="interactionType" name="interactionType" className={selectClass} defaultValue="phone">
                    {CRM_INTERACTION_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {CRM_INTERACTION_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Tytuł</Label>
                  <Input id="title" name="title" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Opis</Label>
                <textarea id="body" name="body" rows={2} className={textareaClass} />
              </div>
              <Button type="submit" size="sm" disabled={pending}>
                Zapisz interakcję
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
