"use client";

import { useTransition } from "react";
import { Check, X } from "lucide-react";

import { approveAiAction, rejectAiAction } from "@/features/ai-manager/actions";
import type { AiActionApproval } from "@/types/ai-agent";
import { AI_RISK_LABELS } from "@/types/ai-agent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ApprovalCard({ approval }: { approval: AiActionApproval }) {
  const [pending, startTransition] = useTransition();

  return (
    <Card className="border-amber-200 dark:border-amber-900">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base">Wymaga zatwierdzenia</CardTitle>
          <Badge variant={approval.riskLevel === "high" ? "destructive" : "secondary"}>
            Ryzyko: {AI_RISK_LABELS[approval.riskLevel]}
          </Badge>
        </div>
        <CardDescription>Sprawdź szczegóły przed wykonaniem akcji.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-1 text-sm">
          {Object.entries(approval.preview).map(([key, value]) => (
            <div key={key} className="flex gap-2">
              <dt className="text-muted-foreground capitalize">{key}:</dt>
              <dd className="font-medium">{String(value ?? "—")}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => startTransition(() => void approveAiAction(approval.id))}
          >
            <Check className="mr-1 size-4" /> Zatwierdź
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => startTransition(() => void rejectAiAction(approval.id))}
          >
            <X className="mr-1 size-4" /> Odrzuć
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
