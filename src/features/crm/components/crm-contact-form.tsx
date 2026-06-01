"use client";

import { useActionState } from "react";

import { upsertCrmContactAction, type CrmActionState } from "@/features/crm/actions";
import { CRM_CONTACT_TYPES, CRM_CONTACT_TYPE_LABELS, CRM_PIPELINE_STATUSES, CRM_PIPELINE_STATUS_LABELS } from "@/types/crm";
import type { CrmContactRow } from "@/types/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: CrmActionState = {};
const selectClass = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";
const textareaClass = "border-input bg-background min-h-24 w-full rounded-md border px-3 py-2 text-sm shadow-xs";

export function CrmContactForm({ contact }: { contact?: CrmContactRow }) {
  const [state, action, pending] = useActionState(upsertCrmContactAction, initial);

  return (
    <form action={action} className="space-y-4">
      {contact ? <input type="hidden" name="contactId" value={contact.id} /> : null}
      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactType">Typ kontaktu</Label>
          <select
            id="contactType"
            name="contactType"
            defaultValue={contact?.contactType ?? "sponsor"}
            className={selectClass}
          >
            {CRM_CONTACT_TYPES.map((t) => (
              <option key={t} value={t}>
                {CRM_CONTACT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pipelineStatus">Status pipeline</Label>
          <select
            id="pipelineStatus"
            name="pipelineStatus"
            defaultValue={contact?.pipelineStatus ?? "new_contact"}
            className={selectClass}
          >
            {CRM_PIPELINE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {CRM_PIPELINE_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nazwa *</Label>
        <Input id="name" name="name" defaultValue={contact?.name} required />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="contactPerson">Osoba kontaktowa</Label>
          <Input id="contactPerson" name="contactPerson" defaultValue={contact?.contactPerson ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" defaultValue={contact?.email ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input id="phone" name="phone" defaultValue={contact?.phone ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="website">WWW</Label>
          <Input id="website" name="website" defaultValue={contact?.website ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Input id="address" name="address" defaultValue={contact?.address ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="partnerServices">Usługi (partner)</Label>
          <Input id="partnerServices" name="partnerServices" defaultValue={contact?.partnerServices ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="partnerDiscounts">Rabaty (partner)</Label>
          <Input id="partnerDiscounts" name="partnerDiscounts" defaultValue={contact?.partnerDiscounts ?? ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">Notatki</Label>
        <textarea id="notes" name="notes" rows={3} className={textareaClass} defaultValue={contact?.notes ?? ""} />
      </div>

      <Button type="submit" disabled={pending}>
        {contact ? "Zapisz zmiany" : "Dodaj kontakt"}
      </Button>
    </form>
  );
}
