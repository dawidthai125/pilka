"use client";

import { useActionState } from "react";

import {
  createSponsorLead,
  updateSponsorLeadStatus,
  type SponsorActionState,
} from "@/features/sponsors/actions";
import { SPONSOR_LEAD_STATUS_LABELS, SPONSOR_LEAD_STATUSES } from "@/lib/sponsors/constants";
import type { SponsorLead } from "@/types/sponsors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: SponsorActionState = {};

export function SponsorLeadsPanel({
  leads,
  canManage,
}: {
  leads: SponsorLead[];
  canManage: boolean;
}) {
  const [createState, createAction, createPending] = useActionState(createSponsorLead, initialState);

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={createAction} className="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <Input name="companyName" placeholder="Nazwa firmy *" required className="sm:col-span-2" />
          <Input name="contactName" placeholder="Kontakt" />
          <Input name="contactEmail" type="email" placeholder="Email" />
          <Input name="contactPhone" placeholder="Telefon" />
          <textarea name="notes" rows={2} placeholder="Notatki" className="border-input bg-background sm:col-span-2 rounded-md border px-3 py-2 text-sm" />
          {createState.error ? <p className="text-sm text-destructive sm:col-span-2">{createState.error}</p> : null}
          <Button type="submit" disabled={createPending} className="sm:col-span-2 sm:w-fit">
            Dodaj lead
          </Button>
        </form>
      ) : null}

      <div className="overflow-hidden rounded-xl border">
        <ul className="divide-y">
          {leads.map((lead) => (
            <li key={lead.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{lead.companyName}</p>
                <p className="text-sm text-muted-foreground">
                  {[lead.contactName, lead.contactEmail, lead.contactPhone].filter(Boolean).join(" · ")}
                </p>
                {lead.notes ? <p className="mt-1 text-sm">{lead.notes}</p> : null}
              </div>
              {canManage ? <LeadStatusForm leadId={lead.id} status={lead.status} /> : (
                <span className="text-sm">{SPONSOR_LEAD_STATUS_LABELS[lead.status]}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LeadStatusForm({ leadId, status }: { leadId: string; status: SponsorLead["status"] }) {
  const action = updateSponsorLeadStatus.bind(null, leadId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex items-center gap-2">
      <select
        name="status"
        defaultValue={status}
        className="border-input bg-background min-h-[44px] h-9 rounded-md border px-2 text-sm sm:min-h-[36px]"
      >
        {SPONSOR_LEAD_STATUSES.map((s) => (
          <option key={s} value={s}>{SPONSOR_LEAD_STATUS_LABELS[s]}</option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="outline" disabled={pending}>Zapisz</Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}
