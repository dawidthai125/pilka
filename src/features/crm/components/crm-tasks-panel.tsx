"use client";

import { useActionState } from "react";

import { completeCrmTaskAction, upsertCrmTaskAction, type CrmActionState } from "@/features/crm/actions";
import { CRM_TASK_TYPE_LABELS } from "@/types/crm";
import type { CrmTaskRow } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initial: CrmActionState = {};
const selectClass = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function CrmTasksPanel({ tasks, canManage }: { tasks: CrmTaskRow[]; canManage: boolean }) {
  const [state, action, pending] = useActionState(upsertCrmTaskAction, initial);
  const openTasks = tasks.filter((t) => t.status === "open");

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {openTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Brak otwartych zadań.</p>
        ) : (
          openTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {CRM_TASK_TYPE_LABELS[task.taskType]}
                    {task.contactName ? ` · ${task.contactName}` : ""}
                    {task.dueAt ? ` · ${new Date(task.dueAt).toLocaleDateString("pl-PL")}` : ""}
                  </p>
                </div>
                {canManage ? (
                  <Button size="sm" variant="outline" onClick={() => void completeCrmTaskAction(task.id)}>
                    Zamknij
                  </Button>
                ) : (
                  <Badge variant="secondary">{task.status}</Badge>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nowe zadanie / przypomnienie</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={action} className="space-y-3">
              {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
              {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taskType">Typ</Label>
                  <select id="taskType" name="taskType" className={selectClass} defaultValue="reminder">
                    {Object.entries(CRM_TASK_TYPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dueAt">Termin</Label>
                  <Input id="dueAt" name="dueAt" type="datetime-local" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Tytuł</Label>
                <Input id="title" name="title" required />
              </div>
              <Button type="submit" disabled={pending}>
                Utwórz zadanie
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
