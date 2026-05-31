"use client";

import Link from "next/link";
import { useActionState } from "react";

import { publishAiReport, updateAiReport, type AiActionState } from "@/features/ai/actions";
import {
  AI_REPORT_CATEGORY_LABELS,
  AI_REPORT_STATUS_LABELS,
  AI_REPORT_TYPE_LABELS,
} from "@/lib/ai/constants";
import type { AiReport } from "@/types/ai";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const initialState: AiActionState = {};

export function AiReportEditor({
  report,
  canPublish,
}: {
  report: AiReport;
  canPublish: boolean;
}) {
  const updateAction = updateAiReport.bind(null, report.id);
  const publishAction = publishAiReport.bind(null, report.id);
  const [updateState, updateFormAction, updatePending] = useActionState(updateAction, initialState);
  const [publishState, publishFormAction, publishPending] = useActionState(publishAction, initialState);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/ai/reports" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          ← Raporty
        </Link>
        <Badge variant={report.status === "published" ? "default" : "secondary"}>
          {AI_REPORT_STATUS_LABELS[report.status]}
        </Badge>
      </div>

      <div>
        <p className="text-sm text-muted-foreground">
          {AI_REPORT_CATEGORY_LABELS[report.category]} · {AI_REPORT_TYPE_LABELS[report.reportType]}
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Edycja raportu</CardTitle></CardHeader>
        <CardContent>
          <form action={updateFormAction} className="space-y-4">
            {updateState.error ? <p className="text-sm text-destructive">{updateState.error}</p> : null}
            {updateState.success ? <p className="text-sm text-primary">{updateState.success}</p> : null}
            <div className="space-y-1">
              <Label>Tytuł</Label>
              <Input name="title" defaultValue={report.title} required />
            </div>
            <div className="space-y-1">
              <Label>Treść</Label>
              <textarea
                name="content"
                rows={16}
                defaultValue={report.content}
                required
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-xs"
              />
            </div>
            <Button type="submit" disabled={updatePending}>Zapisz zmiany</Button>
          </form>
        </CardContent>
      </Card>

      {canPublish && report.status === "draft" ? (
        <Card>
          <CardHeader><CardTitle>Publikacja</CardTitle></CardHeader>
          <CardContent>
            <form action={publishFormAction}>
              {publishState.error ? <p className="mb-2 text-sm text-destructive">{publishState.error}</p> : null}
              {publishState.success ? <p className="mb-2 text-sm text-primary">{publishState.success}</p> : null}
              <p className="mb-3 text-sm text-muted-foreground">
                Zaakceptuj treść przed publikacją (social media, raporty zarządu).
              </p>
              <Button type="submit" disabled={publishPending}>Opublikuj raport</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
