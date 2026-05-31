"use client";

import { useActionState } from "react";

import {
  createSponsorPublication,
  type SponsorActionState,
} from "@/features/sponsors/actions";
import {
  SPONSOR_PUBLICATION_SOURCE_LABELS,
  SPONSOR_PUBLICATION_SOURCES,
} from "@/lib/sponsors/constants";
import type { Sponsor } from "@/types/sponsors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SponsorActionState = {};

export function SponsorPublicationForm({ sponsors }: { sponsors: Sponsor[] }) {
  const [state, formAction, pending] = useActionState(createSponsorPublication, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-4 rounded-xl border p-4 sm:p-6">
      <div>
        <Label htmlFor="title">Tytuł *</Label>
        <Input id="title" name="title" required />
      </div>
      <div>
        <Label htmlFor="publishedAt">Data *</Label>
        <Input id="publishedAt" name="publishedAt" type="date" required />
      </div>
      <div>
        <Label htmlFor="source">Źródło</Label>
        <select id="source" name="source" className="border-input bg-background mt-1 h-10 w-full rounded-md border px-3 text-sm">
          {SPONSOR_PUBLICATION_SOURCES.map((s) => (
            <option key={s} value={s}>{SPONSOR_PUBLICATION_SOURCE_LABELS[s]}</option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="description">Opis</Label>
        <textarea id="description" name="description" rows={3} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" />
      </div>
      <div>
        <Label htmlFor="imageUrl">URL zdjęcia</Label>
        <Input id="imageUrl" name="imageUrl" type="url" />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Powiązani sponsorzy</legend>
        {sponsors.map((s) => (
          <label key={s.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="sponsorIds" value={s.id} />
            {s.companyName}
          </label>
        ))}
      </fieldset>
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}
      <Button type="submit" disabled={pending}>Zapisz publikację</Button>
    </form>
  );
}
