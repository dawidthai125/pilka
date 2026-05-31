"use client";

import { useActionState } from "react";

import {
  dismissAiSuggestion,
  refreshAiSuggestions,
  type AiActionState,
} from "@/features/ai/actions";
import { AI_SUGGESTION_TYPE_LABELS } from "@/lib/ai/constants";
import type { AiSuggestion } from "@/types/ai";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: AiActionState = {};

export function AiSuggestionsPanel({ suggestions }: { suggestions: AiSuggestion[] }) {
  const [, refreshAction, refreshPending] = useActionState(refreshAiSuggestions, initialState);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Sugestie AI</h1>
          <p className="text-sm text-muted-foreground">
            Automatyczne wykrywanie: frekwencja, dokumenty, kontuzje, brak odpowiedzi.
          </p>
        </div>
        <form action={refreshAction}>
          <Button type="submit" variant="outline" disabled={refreshPending}>
            Odśwież sugestie
          </Button>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {suggestions.length === 0 ? (
          <p className="md:col-span-2 rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
            Brak otwartych sugestii.
          </p>
        ) : (
          suggestions.map((item) => (
            <SuggestionCard key={item.id} suggestion={item} />
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion }: { suggestion: AiSuggestion }) {
  const action = dismissAiSuggestion.bind(null, suggestion.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{suggestion.title}</CardTitle>
          <Badge variant="secondary">{AI_SUGGESTION_TYPE_LABELS[suggestion.suggestionType]}</Badge>
        </div>
        <CardDescription>{suggestion.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestion.actionHint ? (
          <p className="text-sm"><strong>Działanie:</strong> {suggestion.actionHint}</p>
        ) : null}
        <form action={formAction}>
          {state.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="mb-2 text-sm text-primary">{state.success}</p> : null}
          <Button type="submit" size="sm" variant="outline" disabled={pending}>
            Zamknij sugestię
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
