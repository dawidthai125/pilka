"use client";

import { useTransition } from "react";
import { Sparkles } from "lucide-react";

import { executeAgentCommand } from "@/features/ai-manager/actions";
import type { AutomationProposal } from "@/lib/ai/agent/automations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AutomationProposals({ proposals }: { proposals: AutomationProposal[] }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {proposals.map((proposal) => (
        <Card key={proposal.id}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4 text-amber-500" />
              {proposal.title}
            </CardTitle>
            <CardDescription>{proposal.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => {
                const formData = new FormData();
                formData.set("command", proposal.command);
                startTransition(() => void executeAgentCommand({}, formData));
              }}
            >
              Uruchom analizę
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
