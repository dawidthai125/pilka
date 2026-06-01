"use client";

import { useEffect, useState } from "react";
import { Bot, Command } from "lucide-react";

import { AgentCommandForm } from "@/features/ai-manager/components/agent-command-form";
import { ApprovalCard } from "@/features/ai-manager/components/approval-card";
import { AutomationProposals } from "@/features/ai-manager/components/automation-proposals";
import type { AutomationProposal } from "@/lib/ai/agent/automations";
import type { AiActionApproval } from "@/types/ai-agent";
import { AI_MANAGER_NAME } from "@/types/ai-agent";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AgentManagerDashboard({
  memory,
  automations,
  pendingApprovals,
}: {
  memory: string;
  automations: AutomationProposal[];
  pendingApprovals: AiActionApproval[];
}) {
  const [, setRefresh] = useState(0);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{AI_MANAGER_NAME}</h1>
          <Badge variant="secondary">Agent AI</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Agent wykonuje działania w systemie zgodnie z Twoimi uprawnieniami. Akcje średniego i
          wysokiego ryzyka wymagają zatwierdzenia.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Command className="size-4" /> Polecenie agenta
          </CardTitle>
          <CardDescription>
            Użyj naturalnego języka lub skrótu Ctrl+K w dowolnym miejscu aplikacji.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AgentCommandForm onSuccess={() => setRefresh((n) => n + 1)} />
        </CardContent>
      </Card>

      {pendingApprovals.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Oczekujące zatwierdzenia</h2>
          {pendingApprovals.map((approval) => (
            <ApprovalCard key={approval.id} approval={approval} />
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Proponowane automatyzacje</h2>
        <AutomationProposals proposals={automations} />
      </section>

      {memory ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4" /> Pamięć sesji
            </CardTitle>
            <CardDescription>Kontekst bieżącej rozmowy — tylko w ramach klubu.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{memory}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function AiCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/40 p-4 pt-[15vh]">
      <div
        role="dialog"
        aria-label="AI Command Palette"
        className="w-full max-w-lg rounded-xl border bg-card p-4 shadow-xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium">AI Club Manager — Ctrl+K</p>
          <button type="button" className="text-xs text-muted-foreground" onClick={() => setOpen(false)}>
            Esc
          </button>
        </div>
        <AgentCommandForm compact onSuccess={() => setOpen(false)} />
      </div>
    </div>
  );
}
