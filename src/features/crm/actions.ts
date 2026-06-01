"use server";

import { canManageCrm } from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { notifyCrmTaskReminder } from "@/lib/crm/dispatch";
import { generateCrmDraft } from "@/lib/crm/generator";
import {
  parseCrmContactType,
  parseCrmEventType,
  parseCrmInteractionType,
  parseCrmPipelineStatus,
  parseCrmTaskType,
} from "@/lib/crm/mappers";
import { revalidateCrmPaths } from "@/lib/crm/revalidate";
import { createClient } from "@/lib/supabase/server";
import type { CrmAiDraftKind } from "@/types/crm";

export type CrmActionState = { error?: string; success?: string; draft?: { title: string; body: string } };

function requireCrmManage(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canManageCrm(access.roles)) return { error: "Brak uprawnień CRM." } as CrmActionState;
  return null;
}

export async function upsertCrmContactAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const access = await requireAccessContext();
  const denied = requireCrmManage(access);
  if (denied) return denied;

  const contactType = parseCrmContactType(String(formData.get("contactType") ?? ""));
  const name = String(formData.get("name") ?? "").trim();
  if (!contactType || !name) return { error: "Typ i nazwa są wymagane." };

  const pipelineStatus =
    parseCrmPipelineStatus(String(formData.get("pipelineStatus") ?? "new_contact")) ?? "new_contact";

  const row = {
    club_id: access.clubId,
    contact_type: contactType,
    name,
    contact_person: String(formData.get("contactPerson") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    website: String(formData.get("website") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    pipeline_status: pipelineStatus,
    partner_services: String(formData.get("partnerServices") ?? "").trim() || null,
    partner_discounts: String(formData.get("partnerDiscounts") ?? "").trim() || null,
    created_by: access.userId,
  };

  const supabase = await createClient();
  const contactId = String(formData.get("contactId") ?? "").trim();

  const { error } = contactId
    ? await supabase.from("crm_contacts").update(row).eq("id", contactId).eq("club_id", access.clubId)
    : await supabase.from("crm_contacts").insert(row);

  if (error) return { error: error.message };
  revalidateCrmPaths();
  return { success: contactId ? "Kontakt zaktualizowany." : "Kontakt dodany." };
}

export async function updatePipelineStatusAction(
  contactId: string,
  statusRaw: string,
): Promise<CrmActionState> {
  const access = await requireAccessContext();
  const denied = requireCrmManage(access);
  if (denied) return denied;

  const status = parseCrmPipelineStatus(statusRaw);
  if (!status) return { error: "Nieprawidłowy status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_contacts")
    .update({ pipeline_status: status })
    .eq("id", contactId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateCrmPaths();
  return { success: "Status pipeline zaktualizowany." };
}

export async function addCrmInteractionAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const access = await requireAccessContext();
  const denied = requireCrmManage(access);
  if (denied) return denied;

  const contactId = String(formData.get("contactId") ?? "");
  const interactionType = parseCrmInteractionType(String(formData.get("interactionType") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  if (!contactId || !interactionType || !title) return { error: "Uzupełnij wymagane pola." };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_interactions").insert({
    club_id: access.clubId,
    contact_id: contactId,
    interaction_type: interactionType,
    title,
    body: String(formData.get("body") ?? "").trim() || null,
    occurred_at: String(formData.get("occurredAt") ?? new Date().toISOString()),
    created_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateCrmPaths();
  return { success: "Interakcja dodana do historii." };
}

export async function upsertCrmTaskAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const access = await requireAccessContext();
  const denied = requireCrmManage(access);
  if (denied) return denied;

  const taskType = parseCrmTaskType(String(formData.get("taskType") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  if (!taskType || !title) return { error: "Typ i tytuł zadania są wymagane." };

  const contactId = String(formData.get("contactId") ?? "").trim() || null;
  const dueRaw = String(formData.get("dueAt") ?? "").trim();
  const notifyUserId = String(formData.get("notifyUserId") ?? "").trim() || access.userId;

  const supabase = await createClient();
  const { data: task, error } = await supabase
    .from("crm_tasks")
    .insert({
      club_id: access.clubId,
      contact_id: contactId,
      task_type: taskType,
      title,
      notes: String(formData.get("notes") ?? "").trim() || null,
      due_at: dueRaw ? new Date(dueRaw).toISOString() : null,
      notify_user_id: notifyUserId,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (task?.id && dueRaw) {
    await notifyCrmTaskReminder(
      access.clubId,
      notifyUserId,
      task.id as string,
      "Zadanie CRM",
      title,
    );
  }

  revalidateCrmPaths();
  return { success: "Zadanie CRM utworzone." };
}

export async function completeCrmTaskAction(taskId: string): Promise<CrmActionState> {
  const access = await requireAccessContext();
  const denied = requireCrmManage(access);
  if (denied) return denied;

  const supabase = await createClient();
  const { error } = await supabase
    .from("crm_tasks")
    .update({ status: "done" })
    .eq("id", taskId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateCrmPaths();
  return { success: "Zadanie zamknięte." };
}

export async function createCrmEventAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const access = await requireAccessContext();
  const denied = requireCrmManage(access);
  if (denied) return denied;

  const eventType = parseCrmEventType(String(formData.get("eventType") ?? "other")) ?? "other";
  const title = String(formData.get("title") ?? "").trim();
  const startsAt = String(formData.get("startsAt") ?? "").trim();
  if (!title || !startsAt) return { error: "Tytuł i data są wymagane." };

  const supabase = await createClient();
  const { error } = await supabase.from("crm_events").insert({
    club_id: access.clubId,
    event_type: eventType,
    title,
    description: String(formData.get("description") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    starts_at: new Date(startsAt).toISOString(),
    ends_at: String(formData.get("endsAt") ?? "").trim()
      ? new Date(String(formData.get("endsAt"))).toISOString()
      : null,
    created_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateCrmPaths();
  return { success: "Wydarzenie utworzone." };
}

export async function recordCrmDonationAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const access = await requireAccessContext();
  const denied = requireCrmManage(access);
  if (denied) return denied;

  const amount = Number(formData.get("amount"));
  if (!Number.isFinite(amount) || amount < 0) return { error: "Nieprawidłowa kwota." };

  const contactId = String(formData.get("contactId") ?? "").trim() || null;
  const donatedAt = String(formData.get("donatedAt") ?? new Date().toISOString().slice(0, 10));
  const source = String(formData.get("source") ?? "").trim() || null;
  const purpose = String(formData.get("purpose") ?? "").trim() || null;
  const syncFinance = formData.get("syncFinance") === "on";

  const supabase = await createClient();

  const { data: donation, error: donationError } = await supabase
    .from("crm_donations")
    .insert({
      club_id: access.clubId,
      contact_id: contactId,
      amount,
      donated_at: donatedAt,
      source,
      purpose,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (donationError) return { error: donationError.message };

  if (syncFinance && donation?.id) {
    const description = purpose ?? `Darowizna CRM${source ? `: ${source}` : ""}`;
    const { data: income, error: incomeError } = await supabase
      .from("finance_income")
      .insert({
        club_id: access.clubId,
        transaction_date: donatedAt,
        amount,
        description,
        category: "donations",
        created_by: access.userId,
      })
      .select("id")
      .single();

    if (!incomeError && income?.id) {
      await supabase
        .from("crm_donations")
        .update({ finance_income_id: income.id })
        .eq("id", String(donation.id));
      await supabase
        .from("finance_income")
        .update({ crm_donation_id: String(donation.id) })
        .eq("id", income.id);
    }
  }

  revalidateCrmPaths();
  return { success: "Darowizna zarejestrowana." };
}

export async function generateCrmAiDraftAction(
  _prev: CrmActionState,
  formData: FormData,
): Promise<CrmActionState> {
  const access = await requireAccessContext();
  if (!canManageCrm(access.roles)) return { error: "Brak uprawnień." };

  const kind = String(formData.get("kind") ?? "") as CrmAiDraftKind;
  const prompt = String(formData.get("prompt") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim() || undefined;
  if (!prompt) return { error: "Opisz czego potrzebujesz." };

  const supabase = await createClient();
  const { data: club } = await supabase
    .from("clubs")
    .select("public_name, official_name")
    .eq("id", access.clubId)
    .maybeSingle();

  const draft = await generateCrmDraft({
    kind,
    clubName: club?.public_name ?? club?.official_name ?? "Klub",
    contactName,
    prompt,
  });

  return {
    success: draft.aiUsed ? "Szkic AI gotowy (nie wysłano)." : "Szkic szablonowy gotowy.",
    draft: { title: draft.title, body: draft.body },
  };
}
