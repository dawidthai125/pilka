"use server";

import { revalidatePath } from "next/cache";

import { canManageSponsors } from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { buildSponsorReportContent } from "@/lib/sponsors/insights";
import { generateAiReportContent, isOpenAiConfigured } from "@/integrations/openai";
import { createClient } from "@/lib/supabase/server";
import type {
  SponsorCooperationStatus,
  SponsorLeadStatus,
  SponsorNoteType,
  SponsorPublicationSource,
} from "@/types/sponsors";

export type SponsorActionState = { error?: string; success?: string; id?: string };

function revalidateSponsorPaths() {
  revalidatePath("/sponsors");
  revalidatePath("/sponsors/leads");
  revalidatePath("/sponsors/publications");
  revalidatePath("/sponsors/portal");
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

export async function createSponsor(
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const companyName = readString(formData, "companyName");
  if (!companyName) return { error: "Podaj nazwę firmy." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsors")
    .insert({
      club_id: access.clubId,
      company_name: companyName,
      logo_url: readString(formData, "logoUrl") || null,
      nip: readString(formData, "nip") || null,
      address: readString(formData, "address") || null,
      city: readString(formData, "city") || null,
      postal_code: readString(formData, "postalCode") || null,
      website: readString(formData, "website") || null,
      phone: readString(formData, "phone") || null,
      email: readString(formData, "email") || null,
      contact_first_name: readString(formData, "contactFirstName") || null,
      contact_last_name: readString(formData, "contactLastName") || null,
      contact_position: readString(formData, "contactPosition") || null,
      contact_phone: readString(formData, "contactPhone") || null,
      contact_email: readString(formData, "contactEmail") || null,
      cooperation_status: (readString(formData, "cooperationStatus") ||
        "potential") as SponsorCooperationStatus,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się utworzyć sponsora." };
  revalidateSponsorPaths();
  return { success: "Sponsor dodany.", id: data.id };
}

export async function updateSponsor(
  sponsorId: string,
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const companyName = readString(formData, "companyName");
  if (!companyName) return { error: "Podaj nazwę firmy." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsors")
    .update({
      company_name: companyName,
      logo_url: readString(formData, "logoUrl") || null,
      nip: readString(formData, "nip") || null,
      address: readString(formData, "address") || null,
      city: readString(formData, "city") || null,
      postal_code: readString(formData, "postalCode") || null,
      website: readString(formData, "website") || null,
      phone: readString(formData, "phone") || null,
      email: readString(formData, "email") || null,
      contact_first_name: readString(formData, "contactFirstName") || null,
      contact_last_name: readString(formData, "contactLastName") || null,
      contact_position: readString(formData, "contactPosition") || null,
      contact_phone: readString(formData, "contactPhone") || null,
      contact_email: readString(formData, "contactEmail") || null,
      cooperation_status: readString(formData, "cooperationStatus") as SponsorCooperationStatus,
    })
    .eq("id", sponsorId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateSponsorPaths();
  revalidatePath(`/sponsors/${sponsorId}`);
  return { success: "Zapisano." };
}

export async function createSponsorContract(
  sponsorId: string,
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const name = readString(formData, "name");
  const startDate = readString(formData, "startDate");
  const endDate = readString(formData, "endDate");
  const value = Number(readString(formData, "value") || "0");
  if (!name || !startDate || !endDate) return { error: "Wypełnij wymagane pola umowy." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsor_contracts")
    .insert({
      club_id: access.clubId,
      sponsor_id: sponsorId,
      name,
      start_date: startDate,
      end_date: endDate,
      value,
      currency: readString(formData, "currency") || "PLN",
      benefits_description: readString(formData, "benefitsDescription") || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Błąd zapisu umowy." };

  const fileName = readString(formData, "attachmentName");
  const fileUrl = readString(formData, "attachmentUrl");
  if (fileName && fileUrl) {
    await supabase.from("sponsor_contract_attachments").insert({
      club_id: access.clubId,
      contract_id: data.id,
      file_name: fileName,
      file_url: fileUrl,
      uploaded_by: access.userId,
    });
  }

  revalidateSponsorPaths();
  revalidatePath(`/sponsors/${sponsorId}`);
  return { success: "Umowa dodana.", id: data.id };
}

export async function addSponsorNote(
  sponsorId: string,
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const content = readString(formData, "content");
  if (!content) return { error: "Wpisz treść notatki." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_notes").insert({
    club_id: access.clubId,
    sponsor_id: sponsorId,
    note_type: (readString(formData, "noteType") || "note") as SponsorNoteType,
    content,
    contact_date: readString(formData, "contactDate") || new Date().toISOString().slice(0, 10),
    author_id: access.userId,
  });

  if (error) return { error: error.message };
  revalidatePath(`/sponsors/${sponsorId}`);
  return { success: "Notatka dodana." };
}

export async function createSponsorLead(
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const companyName = readString(formData, "companyName");
  if (!companyName) return { error: "Podaj nazwę firmy." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_leads").insert({
    club_id: access.clubId,
    company_name: companyName,
    contact_name: readString(formData, "contactName") || null,
    contact_email: readString(formData, "contactEmail") || null,
    contact_phone: readString(formData, "contactPhone") || null,
    status: (readString(formData, "status") || "new") as SponsorLeadStatus,
    notes: readString(formData, "notes") || null,
    assigned_to: access.userId,
  });

  if (error) return { error: error.message };
  revalidatePath("/sponsors/leads");
  return { success: "Lead dodany." };
}

export async function updateSponsorLeadStatus(
  leadId: string,
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sponsor_leads")
    .update({ status: readString(formData, "status") as SponsorLeadStatus })
    .eq("id", leadId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidatePath("/sponsors/leads");
  return { success: "Status zaktualizowany." };
}

export async function createSponsorPublication(
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const title = readString(formData, "title");
  const publishedAt = readString(formData, "publishedAt");
  if (!title || !publishedAt) return { error: "Wypełnij tytuł i datę." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsor_publications")
    .insert({
      club_id: access.clubId,
      title,
      published_at: publishedAt,
      description: readString(formData, "description") || null,
      image_url: readString(formData, "imageUrl") || null,
      source: (readString(formData, "source") || "other") as SponsorPublicationSource,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Błąd zapisu publikacji." };

  const sponsorIds = formData.getAll("sponsorIds").map(String).filter(Boolean);
  for (const sponsorId of sponsorIds) {
    await supabase.from("sponsor_publication_links").insert({
      club_id: access.clubId,
      publication_id: data.id,
      sponsor_id: sponsorId,
    });
    await supabase.from("sponsor_exposure").insert({
      club_id: access.clubId,
      sponsor_id: sponsorId,
      exposure_type: "publication",
      title,
      description: readString(formData, "description") || null,
      exposure_date: publishedAt,
      publication_id: data.id,
    });
  }

  revalidatePath("/sponsors/publications");
  return { success: "Publikacja dodana.", id: data.id };
}

export async function generateSponsorReport(
  sponsorId: string,
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const periodStart = readString(formData, "periodStart");
  const periodEnd = readString(formData, "periodEnd");
  if (!periodStart || !periodEnd) return { error: "Podaj okres raportu." };

  const content = await buildSponsorReportContent(access.clubId, sponsorId, periodStart, periodEnd);
  const sponsorName = String(content.sponsorName ?? "Sponsor");

  let aiSummary = "";
  if (isOpenAiConfigured()) {
    try {
      aiSummary = await generateAiReportContent(
        `Przygotuj krótkie podsumowanie raportu sponsorskiego dla ${sponsorName} za okres ${periodStart}–${periodEnd}. Markdown, max 400 słów.`,
        sponsorName,
        JSON.stringify(content, null, 2),
      );
    } catch {
      /* fallback */
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsor_reports")
    .insert({
      club_id: access.clubId,
      sponsor_id: sponsorId,
      period_start: periodStart,
      period_end: periodEnd,
      title: `Raport sponsorski — ${sponsorName} (${periodStart} – ${periodEnd})`,
      content: { ...content, aiSummary },
      status: "draft",
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Błąd generowania raportu." };
  revalidatePath(`/sponsors/${sponsorId}`);
  return { success: "Raport wygenerowany.", id: data.id };
}

export async function publishSponsorReport(
  reportId: string,
  _prev: SponsorActionState,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { data: report } = await supabase
    .from("sponsor_reports")
    .select("sponsor_id")
    .eq("id", reportId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!report) return { error: "Raport nie istnieje." };

  const { error } = await supabase
    .from("sponsor_reports")
    .update({ status: "published" })
    .eq("id", reportId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidatePath(`/sponsors/reports/${reportId}`);
  revalidatePath(`/sponsors/${report.sponsor_id}`);
  revalidatePath("/sponsors/portal");
  return { success: "Raport opublikowany." };
}

export async function createSponsorFinancialEntry(
  sponsorId: string,
  _prev: SponsorActionState,
  formData: FormData,
): Promise<SponsorActionState> {
  const access = await requireAccessContext();
  if (!canManageSponsors(access.roles)) return { error: "Brak uprawnień." };

  const amount = Number(readString(formData, "amount") || "0");
  if (!amount) return { error: "Podaj kwotę." };

  const supabase = await createClient();
  const { error } = await supabase.from("sponsor_financial_entries").insert({
    club_id: access.clubId,
    sponsor_id: sponsorId,
    contract_id: readString(formData, "contractId") || null,
    entry_type: readString(formData, "entryType") as "payment" | "installment" | "invoice",
    amount,
    currency: readString(formData, "currency") || "PLN",
    due_date: readString(formData, "dueDate") || null,
    status: readString(formData, "status") as "planned" | "pending" | "paid" | "overdue" | "cancelled",
    reference_number: readString(formData, "referenceNumber") || null,
    notes: readString(formData, "notes") || null,
  });

  if (error) return { error: error.message };
  revalidatePath(`/sponsors/${sponsorId}`);
  return { success: "Wpis finansowy dodany." };
}
