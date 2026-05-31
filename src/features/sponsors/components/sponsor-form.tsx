"use client";

import { useActionState } from "react";

import {
  createSponsor,
  type SponsorActionState,
} from "@/features/sponsors/actions";
import {
  SPONSOR_COOPERATION_STATUSES,
  SPONSOR_COOPERATION_STATUS_LABELS,
} from "@/lib/sponsors/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: SponsorActionState = {};

export function SponsorForm() {
  const [state, formAction, pending] = useActionState(createSponsor, initialState);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      <section className="space-y-4 rounded-xl border p-4 sm:p-6">
        <h2 className="font-semibold">Dane firmy</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="companyName">Nazwa firmy *</Label>
            <Input id="companyName" name="companyName" required />
          </div>
          <div>
            <Label htmlFor="nip">NIP</Label>
            <Input id="nip" name="nip" />
          </div>
          <div>
            <Label htmlFor="logoUrl">URL logo</Label>
            <Input id="logoUrl" name="logoUrl" type="url" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="address">Adres</Label>
            <Input id="address" name="address" />
          </div>
          <div>
            <Label htmlFor="city">Miasto</Label>
            <Input id="city" name="city" />
          </div>
          <div>
            <Label htmlFor="postalCode">Kod pocztowy</Label>
            <Input id="postalCode" name="postalCode" />
          </div>
          <div>
            <Label htmlFor="website">Strona www</Label>
            <Input id="website" name="website" type="url" />
          </div>
          <div>
            <Label htmlFor="phone">Telefon</Label>
            <Input id="phone" name="phone" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border p-4 sm:p-6">
        <h2 className="font-semibold">Osoba kontaktowa</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="contactFirstName">Imię</Label>
            <Input id="contactFirstName" name="contactFirstName" />
          </div>
          <div>
            <Label htmlFor="contactLastName">Nazwisko</Label>
            <Input id="contactLastName" name="contactLastName" />
          </div>
          <div>
            <Label htmlFor="contactPosition">Stanowisko</Label>
            <Input id="contactPosition" name="contactPosition" />
          </div>
          <div>
            <Label htmlFor="contactPhone">Telefon</Label>
            <Input id="contactPhone" name="contactPhone" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="contactEmail">Email</Label>
            <Input id="contactEmail" name="contactEmail" type="email" />
          </div>
        </div>
      </section>

      <div>
        <Label htmlFor="cooperationStatus">Status współpracy</Label>
        <select
          id="cooperationStatus"
          name="cooperationStatus"
          className="border-input bg-background min-h-[44px] mt-1 h-10 w-full rounded-md border px-3 text-sm"
          defaultValue="potential"
        >
          {SPONSOR_COOPERATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {SPONSOR_COOPERATION_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-600">{state.success}</p> : null}

      <Button type="submit" disabled={pending}>
        Zapisz sponsora
      </Button>
    </form>
  );
}
