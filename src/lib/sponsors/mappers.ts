import type {
  Sponsor,
  SponsorContract,
  SponsorContractAttachment,
  SponsorExposure,
  SponsorFinancialEntry,
  SponsorLead,
  SponsorNote,
  SponsorPublication,
  SponsorReport,
} from "@/types/sponsors";

export function mapSponsor(row: Record<string, unknown>): Sponsor {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    profileId: (row.profile_id as string | null) ?? null,
    companyName: row.company_name as string,
    logoUrl: (row.logo_url as string | null) ?? null,
    nip: (row.nip as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    postalCode: (row.postal_code as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    contactFirstName: (row.contact_first_name as string | null) ?? null,
    contactLastName: (row.contact_last_name as string | null) ?? null,
    contactPosition: (row.contact_position as string | null) ?? null,
    contactPhone: (row.contact_phone as string | null) ?? null,
    contactEmail: (row.contact_email as string | null) ?? null,
    cooperationStatus: row.cooperation_status as Sponsor["cooperationStatus"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapSponsorContract(row: Record<string, unknown>): SponsorContract {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    sponsorId: row.sponsor_id as string,
    name: row.name as string,
    startDate: row.start_date as string,
    endDate: row.end_date as string,
    value: Number(row.value),
    currency: row.currency as string,
    benefitsDescription: (row.benefits_description as string | null) ?? null,
    status: row.status as SponsorContract["status"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapSponsorContractAttachment(row: Record<string, unknown>): SponsorContractAttachment {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    contractId: row.contract_id as string,
    fileName: row.file_name as string,
    fileUrl: row.file_url as string,
    fileSize: row.file_size != null ? Number(row.file_size) : null,
    uploadedBy: (row.uploaded_by as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function mapSponsorLead(row: Record<string, unknown>): SponsorLead {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    companyName: row.company_name as string,
    contactName: (row.contact_name as string | null) ?? null,
    contactEmail: (row.contact_email as string | null) ?? null,
    contactPhone: (row.contact_phone as string | null) ?? null,
    status: row.status as SponsorLead["status"],
    notes: (row.notes as string | null) ?? null,
    assignedTo: (row.assigned_to as string | null) ?? null,
    convertedSponsorId: (row.converted_sponsor_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapSponsorNote(row: Record<string, unknown>): SponsorNote {
  const profile = row.author as { full_name?: string | null } | null;
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    sponsorId: row.sponsor_id as string,
    noteType: row.note_type as SponsorNote["noteType"],
    content: row.content as string,
    contactDate: row.contact_date as string,
    authorId: row.author_id as string,
    authorName: profile?.full_name ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapSponsorPublication(row: Record<string, unknown>): SponsorPublication {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    title: row.title as string,
    publishedAt: row.published_at as string,
    description: (row.description as string | null) ?? null,
    imageUrl: (row.image_url as string | null) ?? null,
    source: row.source as SponsorPublication["source"],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapSponsorExposure(row: Record<string, unknown>): SponsorExposure {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    sponsorId: row.sponsor_id as string,
    exposureType: row.exposure_type as SponsorExposure["exposureType"],
    title: row.title as string,
    description: (row.description as string | null) ?? null,
    exposureDate: row.exposure_date as string,
    publicationId: (row.publication_id as string | null) ?? null,
    matchId: (row.match_id as string | null) ?? null,
    createdAt: row.created_at as string,
  };
}

export function mapSponsorReport(row: Record<string, unknown>): SponsorReport {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    sponsorId: row.sponsor_id as string,
    periodStart: row.period_start as string,
    periodEnd: row.period_end as string,
    title: row.title as string,
    content: (row.content as Record<string, unknown>) ?? {},
    status: row.status as SponsorReport["status"],
    createdBy: (row.created_by as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function mapSponsorFinancialEntry(row: Record<string, unknown>): SponsorFinancialEntry {
  return {
    id: row.id as string,
    clubId: row.club_id as string,
    sponsorId: row.sponsor_id as string,
    contractId: (row.contract_id as string | null) ?? null,
    entryType: row.entry_type as SponsorFinancialEntry["entryType"],
    amount: Number(row.amount),
    currency: row.currency as string,
    dueDate: (row.due_date as string | null) ?? null,
    paidAt: (row.paid_at as string | null) ?? null,
    status: row.status as SponsorFinancialEntry["status"],
    referenceNumber: (row.reference_number as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}
