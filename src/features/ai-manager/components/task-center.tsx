"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { cancelAiTask } from "@/features/ai-manager/actions";
import type { AiTask, AiTaskStatus } from "@/types/ai-agent";
import { AI_TASK_STATUS_LABELS } from "@/types/ai-agent";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const FILTERS: { id: AiTaskStatus | "all"; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "pending", label: "Oczekujące" },
  { id: "awaiting_approval", label: "Do zatwierdzenia" },
  { id: "completed", label: "Wykonane" },
  { id: "cancelled", label: "Anulowane" },
];

function statusVariant(status: AiTaskStatus): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "awaiting_approval") return "secondary";
  if (status === "failed" || status === "cancelled") return "destructive";
  return "outline";
}

export function TaskCenter({ tasks }: { tasks: AiTask[] }) {
  const [filter, setFilter] = useState<AiTaskStatus | "all">("all");

  const filtered = useMemo(
    () => (filter === "all" ? tasks : tasks.filter((t) => t.status === filter)),
    [tasks, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Brak zadań w wybranym filtrze.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((task) => (
            <li key={task.id} className="rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium">{task.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{task.command}</p>
                  {task.resultSummary ? (
                    <p className="mt-2 text-sm">{task.resultSummary}</p>
                  ) : null}
                </div>
                <Badge variant={statusVariant(task.status)}>{AI_TASK_STATUS_LABELS[task.status]}</Badge>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>{new Date(task.createdAt).toLocaleString("pl-PL")}</span>
                {task.metadata?.kind === "automation_proposal" ? (
                  <Badge variant="outline">Automatyzacja</Badge>
                ) : null}
              </div>
              {(task.status === "pending" || task.status === "awaiting_approval") && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="mt-2"
                  onClick={() => void cancelAiTask(task.id)}
                >
                  Anuluj
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-sm text-muted-foreground">
        <Link href="/ai/manager" className="underline">
          Otwórz AI Club Manager
        </Link>{" "}
        aby wysłać nowe polecenie.
      </p>
    </div>
  );
}
