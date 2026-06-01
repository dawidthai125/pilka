import type {
  CrmContactRow,
  CrmContactType,
  CrmDonationRow,
  CrmEventRow,
  CrmEventType,
  CrmInteractionRow,
  CrmInteractionType,
  CrmPipelineStatus,
  CrmTaskRow,
  CrmTaskStatus,
  CrmTaskType,
  CrmVolunteerArea,
} from "@/types/crm";

export function mapCrmContact(row: Record<string, unknown>): CrmContactRow {
  return {
    id: String(row.id),
    contactType: row.contact_type as CrmContactType,
    name: String(row.name),
    contactPerson: row.contact_person ? String(row.contact_person) : null,
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    address: row.address ? String(row.address) : null,
    website: row.website ? String(row.website) : null,
    notes: row.notes ? String(row.notes) : null,
    pipelineStatus: row.pipeline_status as CrmPipelineStatus,
    profileId: row.profile_id ? String(row.profile_id) : null,
    playerId: row.player_id ? String(row.player_id) : null,
    sponsorId: row.sponsor_id ? String(row.sponsor_id) : null,
    partnerServices: row.partner_services ? String(row.partner_services) : null,
    partnerDiscounts: row.partner_discounts ? String(row.partner_discounts) : null,
    volunteerAreas: (row.volunteer_areas as CrmVolunteerArea[] | null) ?? [],
    isActive: Boolean(row.is_active ?? true),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapCrmInteraction(row: Record<string, unknown>): CrmInteractionRow {
  return {
    id: String(row.id),
    contactId: String(row.contact_id),
    interactionType: row.interaction_type as CrmInteractionType,
    title: String(row.title),
    body: row.body ? String(row.body) : null,
    occurredAt: String(row.occurred_at),
    authorName: row.author_name ? String(row.author_name) : undefined,
  };
}

export function mapCrmTask(row: Record<string, unknown>): CrmTaskRow {
  return {
    id: String(row.id),
    contactId: row.contact_id ? String(row.contact_id) : null,
    contactName: row.contact_name ? String(row.contact_name) : undefined,
    taskType: row.task_type as CrmTaskType,
    title: String(row.title),
    notes: row.notes ? String(row.notes) : null,
    dueAt: row.due_at ? String(row.due_at) : null,
    status: row.status as CrmTaskStatus,
  };
}

export function mapCrmEvent(row: Record<string, unknown>): CrmEventRow {
  return {
    id: String(row.id),
    eventType: row.event_type as CrmEventType,
    title: String(row.title),
    description: row.description ? String(row.description) : null,
    location: row.location ? String(row.location) : null,
    startsAt: String(row.starts_at),
    endsAt: row.ends_at ? String(row.ends_at) : null,
    attendeeCount: Number(row.attendee_count ?? 0),
  };
}

export function mapCrmDonation(row: Record<string, unknown>): CrmDonationRow {
  return {
    id: String(row.id),
    contactId: row.contact_id ? String(row.contact_id) : null,
    contactName: row.contact_name ? String(row.contact_name) : undefined,
    amount: Number(row.amount),
    currency: String(row.currency ?? "PLN"),
    donatedAt: String(row.donated_at),
    source: row.source ? String(row.source) : null,
    purpose: row.purpose ? String(row.purpose) : null,
    financeIncomeId: row.finance_income_id ? String(row.finance_income_id) : null,
  };
}

export function parseCrmContactType(raw: string): CrmContactType | null {
  const types = [
    "sponsor",
    "partner",
    "parent",
    "volunteer",
    "donor",
    "company",
    "institution",
    "media",
  ] as const;
  return types.includes(raw as CrmContactType) ? (raw as CrmContactType) : null;
}

export function parseCrmPipelineStatus(raw: string): CrmPipelineStatus | null {
  const statuses = [
    "new_contact",
    "conversation",
    "offer_sent",
    "negotiation",
    "active_sponsor",
    "lost",
  ] as const;
  return statuses.includes(raw as CrmPipelineStatus) ? (raw as CrmPipelineStatus) : null;
}

export function parseCrmInteractionType(raw: string): CrmInteractionType | null {
  const types = ["meeting", "phone", "email", "event", "sponsorship"] as const;
  return types.includes(raw as CrmInteractionType) ? (raw as CrmInteractionType) : null;
}

export function parseCrmTaskType(raw: string): CrmTaskType | null {
  const types = ["call_back", "send_offer", "meeting", "reminder"] as const;
  return types.includes(raw as CrmTaskType) ? (raw as CrmTaskType) : null;
}

export function parseCrmEventType(raw: string): CrmEventType | null {
  const types = ["tournament", "club_picnic", "sponsor_meeting", "parent_meeting", "other"] as const;
  return types.includes(raw as CrmEventType) ? (raw as CrmEventType) : null;
}
