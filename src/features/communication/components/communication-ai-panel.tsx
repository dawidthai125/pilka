"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateCommunicationAiAction } from "@/features/communication/actions";

export function CommunicationAiPanel() {
  const [state, action, pending] = useActionState(generateCommunicationAiAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">AI Communication Assistant</CardTitle>
        <p className="text-sm text-muted-foreground">
          Generuje propozycję wiadomości — nie wysyła automatycznie. Skopiuj do formularza ogłoszenia lub komunikatu.
        </p>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <select name="kind" className="rounded-md border px-3 py-2 text-sm" defaultValue="announcement">
            <option value="announcement">Ogłoszenie klubowe</option>
            <option value="coach_message">Komunikat trenera</option>
            <option value="reminder">Przypomnienie</option>
            <option value="style_fix">Popraw styl</option>
          </select>
          <input name="teamName" className="rounded-md border px-3 py-2 text-sm" placeholder="Drużyna (opcjonalnie)" />
          <textarea name="prompt" className="min-h-24 rounded-md border px-3 py-2 text-sm" placeholder="Opisz co napisać…" required />
          <textarea name="existingText" className="min-h-16 rounded-md border px-3 py-2 text-sm" placeholder="Tekst do poprawy (opcjonalnie)" />
          <Button type="submit" disabled={pending}>
            {pending ? "Generowanie…" : "Generuj propozycję"}
          </Button>
        </form>
        {state.error ? <p className="mt-3 text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="mt-3 text-sm text-green-600">{state.success}</p> : null}
        {state.draftTitle ? (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm">
            <p className="font-semibold">{state.draftTitle}</p>
            <p className="mt-2 whitespace-pre-wrap">{state.draftBody}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
