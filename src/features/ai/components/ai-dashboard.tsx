import Link from "next/link";
import { Bot, FileText, MessageSquare, Sparkles } from "lucide-react";

import { AI_ASSISTANT_NAME } from "@/lib/ai/constants";
import type { AiSuggestion } from "@/types/ai";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function AiDashboard({
  openSuggestions,
  canManage,
  openAiConfigured,
}: {
  openSuggestions: AiSuggestion[];
  canManage: boolean;
  openAiConfigured: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{AI_ASSISTANT_NAME}</h1>
          <Badge variant={openAiConfigured ? "default" : "secondary"}>
            {openAiConfigured ? "OpenAI aktywne" : "OpenAI — brak klucza API"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Asystent korzysta wyłącznie z danych zapisanych w systemie klubu.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4" /> Chat AI
            </CardTitle>
            <CardDescription>Pytania o frekwencję, formę, kontuzje, bramki.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ai/chat" className={cn(buttonVariants({ size: "sm" }))}>
              Otwórz czat
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="size-4" /> Raporty AI
            </CardTitle>
            <CardDescription>Mecze, treningi, zarząd, social media.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ai/reports" className={cn(buttonVariants({ size: "sm" }))}>
              Centrum raportów
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="size-4" /> Sugestie AI
            </CardTitle>
            <CardDescription>{openSuggestions.length} otwartych alertów.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/ai/suggestions" className={cn(buttonVariants({ size: "sm" }))}>
              Zobacz sugestie
            </Link>
          </CardContent>
        </Card>
      </div>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bot className="size-4" /> Szybkie generowanie
            </CardTitle>
            <CardDescription>Raporty zarządu i analizy dostępne w centrum raportów.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Link href="/ai/reports" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
              Generuj raporty
            </Link>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
