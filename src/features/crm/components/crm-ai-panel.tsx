"use client";

import { useActionState } from "react";

import { generateCrmAiDraftAction, type CrmActionState } from "@/features/crm/actions";
import type { CrmAiInsight } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initial: CrmActionState = {};
const selectClass = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";
const textareaClass = "border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs";

export function CrmAiPanel({ insights }: { insights: CrmAiInsight[] }) {
  const [state, action, pending] = useActionState(generateCrmAiDraftAction, initial);

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Rekomendacje i szkice AI — bez automatycznego wysyłania wiadomości.
      </p>

      {insights.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{insight.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">{insight.body}</CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Generator szkiców</CardTitle>
          <CardDescription>Oferta sponsorska, podziękowanie, mail do rodzica, plan rozmowy.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={action} className="space-y-3">
            {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="kind">Typ szkicu</Label>
                <select id="kind" name="kind" className={selectClass} defaultValue="sponsor_offer">
                  <option value="sponsor_offer">Oferta sponsorska</option>
                  <option value="thank_you">Podziękowanie</option>
                  <option value="parent_email">Mail do rodzica</option>
                  <option value="meeting_plan">Plan rozmowy</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Kontakt (opcjonalnie)</Label>
                <input id="contactName" name="contactName" className={selectClass} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="prompt">Polecenie</Label>
              <textarea id="prompt" name="prompt" rows={3} required placeholder="Opisz kontekst rozmowy..." className={textareaClass} />
            </div>
            <Button type="submit" disabled={pending}>
              Generuj szkic
            </Button>
          </form>

          {state.draft ? (
            <div className="mt-4 space-y-2 rounded-md border p-4">
              <p className="font-medium">{state.draft.title}</p>
              <pre className="whitespace-pre-wrap text-sm">{state.draft.body}</pre>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
