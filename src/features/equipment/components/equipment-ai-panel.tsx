"use client";

import { useState, useTransition } from "react";

import { generateEquipmentDraftAction } from "@/features/equipment/actions";
import type { EquipmentDraftKind } from "@/lib/equipment/generator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EquipmentAiInsight } from "@/types/equipment";

const DRAFT_KINDS: { kind: EquipmentDraftKind; label: string }[] = [
  { kind: "maintenance_plan", label: "Plan konserwacji" },
  { kind: "purchase_list", label: "Lista zakupów" },
  { kind: "return_reminder", label: "Przypomnienie zwrotów" },
  { kind: "inventory_report", label: "Raport majątku" },
];

export function EquipmentAiPanel({ insights }: { insights: EquipmentAiInsight[] }) {
  const [draft, setDraft] = useState<{ title: string; body: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-3">
        <h3 className="font-medium">Rekomendacje AI</h3>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak alertów — stan sprzętu OK.</p>
        ) : (
          insights.map((i) => (
            <Card key={i.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{i.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground">{i.body}</CardContent>
            </Card>
          ))
        )}
      </div>
      <div className="space-y-3">
        <h3 className="font-medium">Generuj szkic (bez auto-wysyłki)</h3>
        <div className="flex flex-wrap gap-2">
          {DRAFT_KINDS.map(({ kind, label }) => (
            <Button
              key={kind}
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await generateEquipmentDraftAction(kind);
                  if (result.draft) setDraft(result.draft);
                })
              }
            >
              {label}
            </Button>
          ))}
        </div>
        {draft ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{draft.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{draft.body}</pre>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
