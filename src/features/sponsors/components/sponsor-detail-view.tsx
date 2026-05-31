"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  addSponsorNote,
  createSponsorContract,
  generateSponsorReport,
  publishSponsorReport,
  type SponsorActionState,
} from "@/features/sponsors/actions";
import { SponsorStatusBadge } from "@/features/sponsors/components/sponsor-status-badge";
import {
  SPONSOR_CONTRACT_STATUS_LABELS,
  SPONSOR_EXPOSURE_TYPE_LABELS,
  SPONSOR_NOTE_TYPE_LABELS,
  SPONSOR_NOTE_TYPES,
} from "@/lib/sponsors/constants";
import type { SponsorDetailData } from "@/types/sponsors";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: SponsorActionState = {};

export function SponsorDetailView({
  data,
  canManage,
}: {
  data: SponsorDetailData;
  canManage: boolean;
}) {
  const { sponsor } = data;
  const contractAction = createSponsorContract.bind(null, sponsor.id);
  const noteAction = addSponsorNote.bind(null, sponsor.id);
  const reportAction = generateSponsorReport.bind(null, sponsor.id);
  const [contractState, contractFormAction, contractPending] = useActionState(
    contractAction,
    initialState,
  );
  const [noteState, noteFormAction, notePending] = useActionState(noteAction, initialState);
  const [reportState, reportFormAction, reportPending] = useActionState(reportAction, initialState);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{sponsor.companyName}</h1>
            <SponsorStatusBadge status={sponsor.cooperationStatus} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[sponsor.address, sponsor.city, sponsor.postalCode].filter(Boolean).join(", ")}
          </p>
        </div>
        <Link href="/sponsors" className={cn(buttonVariants({ variant: "outline" }))}>
          ← Lista sponsorów
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border p-4 sm:p-6">
          <h2 className="mb-3 font-semibold">Dane kontaktowe</h2>
          <dl className="grid gap-2 text-sm">
            <div><dt className="text-muted-foreground">NIP</dt><dd>{sponsor.nip ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Telefon</dt><dd>{sponsor.phone ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Email</dt><dd>{sponsor.email ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">WWW</dt><dd>{sponsor.website ?? "—"}</dd></div>
            <div>
              <dt className="text-muted-foreground">Osoba kontaktowa</dt>
              <dd>
                {[sponsor.contactFirstName, sponsor.contactLastName].filter(Boolean).join(" ") || "—"}
                {sponsor.contactPosition ? ` (${sponsor.contactPosition})` : ""}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-xl border p-4 sm:p-6">
          <h2 className="mb-3 font-semibold">Umowy ({data.contracts.length})</h2>
          <ul className="space-y-3">
            {data.contracts.map((c) => (
              <li key={c.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{c.name}</p>
                <p className="text-muted-foreground">
                  {c.startDate} – {c.endDate} · {c.value.toLocaleString("pl-PL")} {c.currency}
                </p>
                <p>{SPONSOR_CONTRACT_STATUS_LABELS[c.status]}</p>
                {data.contractAttachments
                  .filter((a) => a.contractId === c.id)
                  .map((a) => (
                    <a
                      key={a.id}
                      href={a.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-primary underline"
                    >
                      {a.fileName}
                    </a>
                  ))}
              </li>
            ))}
          </ul>

          {canManage ? (
            <form action={contractFormAction} className="mt-4 space-y-3 border-t pt-4">
              <h3 className="text-sm font-medium">Nowa umowa</h3>
              <Input name="name" placeholder="Nazwa umowy" required />
              <div className="grid gap-2 sm:grid-cols-2">
                <Input name="startDate" type="date" required />
                <Input name="endDate" type="date" required />
              </div>
              <Input name="value" type="number" step="0.01" placeholder="Wartość" required />
              <textarea
                name="benefitsDescription"
                rows={2}
                placeholder="Opis świadczeń"
                className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
              />
              <Input name="attachmentName" placeholder="Nazwa załącznika PDF" />
              <Input name="attachmentUrl" placeholder="URL załącznika PDF" type="url" />
              {contractState.error ? <p className="text-sm text-destructive">{contractState.error}</p> : null}
              {contractState.success ? <p className="text-sm text-emerald-600">{contractState.success}</p> : null}
              <Button type="submit" size="sm" disabled={contractPending}>Dodaj umowę</Button>
            </form>
          ) : null}
        </section>
      </div>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="mb-3 font-semibold">Historia kontaktów</h2>
        <ul className="space-y-2">
          {data.notes.map((n) => (
            <li key={n.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">
                {SPONSOR_NOTE_TYPE_LABELS[n.noteType]} · {n.contactDate}
                {n.authorName ? ` · ${n.authorName}` : ""}
              </p>
              <p className="whitespace-pre-wrap">{n.content}</p>
            </li>
          ))}
        </ul>
        {canManage ? (
          <form action={noteFormAction} className="mt-4 space-y-3 border-t pt-4">
            <select name="noteType" className="border-input bg-background min-h-[44px] rounded-md border px-3 text-sm">
              {SPONSOR_NOTE_TYPES.map((t) => (
                <option key={t} value={t}>{SPONSOR_NOTE_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <Input name="contactDate" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
            <textarea name="content" rows={3} required placeholder="Treść kontaktu..." className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" />
            {noteState.error ? <p className="text-sm text-destructive">{noteState.error}</p> : null}
            <Button type="submit" size="sm" disabled={notePending}>Dodaj wpis</Button>
          </form>
        ) : null}
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="mb-3 font-semibold">Ekspozycja marki</h2>
        <ul className="space-y-2 text-sm">
          {data.exposure.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 border-b pb-2 sm:flex-row sm:justify-between">
              <span>{e.title}</span>
              <span className="text-muted-foreground">
                {SPONSOR_EXPOSURE_TYPE_LABELS[e.exposureType]} · {e.exposureDate}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="mb-3 font-semibold">Raporty</h2>
        <ul className="mb-4 space-y-2">
          {data.reports.map((r) => (
            <li key={r.id} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Link href={`/sponsors/reports/${r.id}`} className="font-medium text-primary underline">
                {r.title}
              </Link>
              <div className="flex gap-2">
                <span className="text-sm text-muted-foreground">{r.status}</span>
                {canManage && r.status === "draft" ? (
                  <PublishReportButton reportId={r.id} />
                ) : null}
              </div>
            </li>
          ))}
        </ul>
        {canManage ? (
          <form action={reportFormAction} className="grid gap-2 border-t pt-4 sm:grid-cols-3">
            <div>
              <Label>Od</Label>
              <Input name="periodStart" type="date" required />
            </div>
            <div>
              <Label>Do</Label>
              <Input name="periodEnd" type="date" required />
            </div>
            <div className="flex items-end">
              <Button type="submit" disabled={reportPending}>Generuj raport</Button>
            </div>
            {reportState.error ? <p className="text-sm text-destructive sm:col-span-3">{reportState.error}</p> : null}
            {reportState.success ? <p className="text-sm text-emerald-600 sm:col-span-3">{reportState.success}</p> : null}
          </form>
        ) : null}
      </section>
    </div>
  );
}

function PublishReportButton({ reportId }: { reportId: string }) {
  const action = publishSponsorReport.bind(null, reportId);
  const [state, formAction, pending] = useActionState(action, initialState);
  return (
    <form action={formAction}>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        Publikuj
      </Button>
      {state.success ? <span className="sr-only">{state.success}</span> : null}
    </form>
  );
}
