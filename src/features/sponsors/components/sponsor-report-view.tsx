"use client";

import Link from "next/link";

import type { SponsorReport } from "@/types/sponsors";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SponsorReportView({
  report,
  sponsorName,
  canManage,
}: {
  report: SponsorReport;
  sponsorName: string;
  canManage: boolean;
}) {
  const content = report.content;
  const publicationsCount = Number(content.publicationsCount ?? 0);
  const exposureCount = Number(content.exposureCount ?? 0);
  const teamResults = String(content.teamResults ?? "—");
  const highlights = Array.isArray(content.highlights) ? content.highlights : [];
  const exposureEvents = Array.isArray(content.exposureEvents)
    ? (content.exposureEvents as Array<{ title?: string; type?: string; date?: string }>)
    : [];
  const aiSummary = typeof content.aiSummary === "string" ? content.aiSummary : null;

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>Drukuj / PDF</Button>
        <Link href={`/sponsors/${report.sponsorId}`} className={cn(buttonVariants({ variant: "outline" }))}>
          Powrót do sponsora
        </Link>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 rounded-xl border bg-card p-6 print:max-w-none print:rounded-none print:border-0 print:bg-white print:p-0">
        <header className="border-b pb-4 text-center print:pb-3">
          <h1 className="text-2xl font-bold">Raport sponsorski</h1>
          <p className="text-muted-foreground">{sponsorName}</p>
          <p className="mt-2 text-sm">
            Okres: {report.periodStart} – {report.periodEnd}
          </p>
        </header>

        <section>
          <h2 className="mb-2 font-semibold">Podsumowanie</h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            <li>Publikacje: {publicationsCount}</li>
            <li>Wydarzenia ekspozycji: {exposureCount}</li>
            <li className="sm:col-span-2">Wyniki drużyny: {teamResults}</li>
          </ul>
        </section>

        {highlights.length ? (
          <section>
            <h2 className="mb-2 font-semibold">Wyróżnione aktywności</h2>
            <ul className="list-disc pl-5 text-sm">
              {highlights.map((h, i) => (
                <li key={i}>{String(h)}</li>
              ))}
            </ul>
          </section>
        ) : null}

        {exposureEvents.length ? (
          <section className="break-inside-avoid">
            <h2 className="mb-2 font-semibold">Lista wydarzeń</h2>
            <ul className="space-y-1 text-sm">
              {exposureEvents.map((e, i) => (
                <li key={i}>
                  {e.date} — {e.title} ({e.type})
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {aiSummary ? (
          <section>
            <h2 className="mb-2 font-semibold">Analiza AI</h2>
            <div className="whitespace-pre-wrap text-sm">{aiSummary}</div>
          </section>
        ) : null}

        {!canManage ? (
          <p className="text-center text-xs text-muted-foreground print:hidden">
            Raport opublikowany przez klub — do pobrania w formacie PDF użyj przycisku Drukuj.
          </p>
        ) : null}
      </article>
    </div>
  );
}
