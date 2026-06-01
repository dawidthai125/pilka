"use server";

import { revalidatePath } from "next/cache";

import { canManageFinance, canReadFinance } from "@/config/permissions";
import { getClub, requireAccessContext } from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";
import { buildFinanceDocumentPath, validateFinanceAttachment } from "@/lib/finance/uploads";
import { buildFinanceReportContent } from "@/lib/finance/insights";
import { createClient } from "@/lib/supabase/server";
import type {
  FinanceBudgetType,
  FinanceDocumentType,
  FinanceExpenseCategory,
  FinanceFeePlanType,
  FinanceGrantStatus,
  FinanceIncomeCategory,
  FinanceReportPeriod,
} from "@/types/finance";

export type FinanceActionState = { error?: string; success?: string; id?: string };

function revalidateFinancePaths() {
  revalidatePath("/finance");
  revalidatePath("/finance/income");
  revalidatePath("/finance/expenses");
  revalidatePath("/finance/fees");
  revalidatePath("/finance/grants");
  revalidatePath("/finance/budgets");
  revalidatePath("/finance/documents");
  revalidatePath("/finance/reports");
  revalidatePath("/finance/portal");
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readAmount(formData: FormData, key: string): number | null {
  const raw = readString(formData, key).replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function createFinanceIncome(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const amount = readAmount(formData, "amount");
  const description = readString(formData, "description");
  const category = readString(formData, "category") as FinanceIncomeCategory;
  const transactionDate = readString(formData, "transactionDate") || new Date().toISOString().slice(0, 10);

  if (!amount || !description) return { error: "Podaj kwotę i opis." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_income")
    .insert({
      club_id: access.clubId,
      amount,
      description,
      category,
      transaction_date: transactionDate,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się dodać przychodu." };
  revalidateFinancePaths();
  return { success: "Przychód dodany.", id: data.id };
}

export async function createFinanceExpense(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const amount = readAmount(formData, "amount");
  const description = readString(formData, "description");
  const category = readString(formData, "category") as FinanceExpenseCategory;
  const transactionDate = readString(formData, "transactionDate") || new Date().toISOString().slice(0, 10);

  if (!amount || !description) return { error: "Podaj kwotę i opis." };

  let attachmentUrl: string | null = null;
  let attachmentName: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    const validation = validateFinanceAttachment(file);
    if (validation) return { error: validation };
    const docId = crypto.randomUUID();
    const path = buildFinanceDocumentPath(access.clubId, "expenses", docId, file.name);
    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage.from("club-assets").upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (uploadError) return { error: uploadError.message };
    attachmentUrl = path;
    attachmentName = file.name;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_expenses")
    .insert({
      club_id: access.clubId,
      amount,
      description,
      category,
      transaction_date: transactionDate,
      attachment_url: attachmentUrl,
      attachment_name: attachmentName,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się dodać kosztu." };
  revalidateFinancePaths();
  return { success: "Koszt dodany.", id: data.id };
}

export async function createFinanceFeePlan(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const name = readString(formData, "name");
  const amount = readAmount(formData, "amount");
  const feeType = readString(formData, "feeType") as FinanceFeePlanType;
  if (!name || !amount) return { error: "Podaj nazwę i kwotę." };

  const supabase = await createClient();
  const { error } = await supabase.from("finance_fee_plans").insert({
    club_id: access.clubId,
    name,
    amount,
    fee_type: feeType,
    team_id: readString(formData, "teamId") || null,
  });

  if (error) return { error: error.message };
  revalidateFinancePaths();
  return { success: "Plan składki utworzony." };
}

export async function createFinancePlayerFee(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const playerId = readString(formData, "playerId");
  const name = readString(formData, "name");
  const amount = readAmount(formData, "amount");
  const dueDate = readString(formData, "dueDate");
  if (!playerId || !name || !amount || !dueDate) return { error: "Uzupełnij wymagane pola." };

  const supabase = await createClient();
  const { data: player } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("club_id", access.clubId)
    .maybeSingle();
  if (!player) return { error: "Wybrany zawodnik nie należy do tego klubu." };

  const { error } = await supabase.from("finance_player_fees").insert({
    club_id: access.clubId,
    player_id: playerId,
    fee_plan_id: readString(formData, "feePlanId") || null,
    name,
    amount_due: amount,
    due_date: dueDate,
    period_month: readString(formData, "periodMonth") || null,
  });

  if (error) return { error: error.message };
  revalidateFinancePaths();
  return { success: "Składka dodana." };
}

export async function recordFinanceFeePayment(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const playerFeeId = readString(formData, "playerFeeId");
  const amount = readAmount(formData, "amount");
  const paymentDate = readString(formData, "paymentDate") || new Date().toISOString().slice(0, 10);
  if (!playerFeeId || !amount) return { error: "Podaj składkę i kwotę wpłaty." };
  if (amount <= 0) return { error: "Kwota wpłaty musi być większa od zera." };

  const supabase = await createClient();
  const { data: fee } = await supabase
    .from("finance_player_fees")
    .select("amount_due, amount_paid")
    .eq("id", playerFeeId)
    .eq("club_id", access.clubId)
    .maybeSingle();
  if (!fee) return { error: "Nie znaleziono składki." };

  const remaining = Number(fee.amount_due) - Number(fee.amount_paid);
  if (amount > remaining) return { error: "Kwota przekracza pozostałą należność." };

  const { error } = await supabase.from("finance_player_fee_payments").insert({
    club_id: access.clubId,
    player_fee_id: playerFeeId,
    amount,
    payment_date: paymentDate,
    note: readString(formData, "note") || null,
    recorded_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateFinancePaths();
  return { success: "Wpłata zarejestrowana." };
}

export async function createFinanceGrant(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const source = readString(formData, "source");
  const amount = readAmount(formData, "amount");
  const periodStart = readString(formData, "periodStart");
  const periodEnd = readString(formData, "periodEnd");
  if (!source || !amount || !periodStart || !periodEnd) return { error: "Uzupełnij wymagane pola." };

  const supabase = await createClient();
  const { error } = await supabase.from("finance_grants").insert({
    club_id: access.clubId,
    source,
    amount,
    period_start: periodStart,
    period_end: periodEnd,
    status: (readString(formData, "status") || "planned") as FinanceGrantStatus,
    description: readString(formData, "description") || null,
  });

  if (error) return { error: error.message };
  revalidateFinancePaths();
  return { success: "Dotacja dodana." };
}

export async function createFinanceBudget(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const name = readString(formData, "name");
  const plannedAmount = readAmount(formData, "plannedAmount");
  const periodStart = readString(formData, "periodStart");
  const periodEnd = readString(formData, "periodEnd");
  if (!name || !plannedAmount || !periodStart || !periodEnd) return { error: "Uzupełnij wymagane pola." };

  const supabase = await createClient();
  const { error } = await supabase.from("finance_budgets").insert({
    club_id: access.clubId,
    name,
    budget_type: readString(formData, "budgetType") as FinanceBudgetType,
    team_id: readString(formData, "teamId") || null,
    season: readString(formData, "season") || null,
    period_start: periodStart,
    period_end: periodEnd,
    planned_amount: plannedAmount,
    notes: readString(formData, "notes") || null,
  });

  if (error) return { error: error.message };
  revalidateFinancePaths();
  return { success: "Budżet utworzony." };
}

export async function uploadFinanceDocument(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const title = readString(formData, "title");
  const documentType = readString(formData, "documentType") as FinanceDocumentType;
  const file = formData.get("file");
  if (!title || !documentType || !(file instanceof File) || file.size === 0) {
    return { error: "Podaj tytuł, typ i plik." };
  }

  const validation = validateFinanceAttachment(file);
  if (validation) return { error: validation };

  const docId = crypto.randomUUID();
  const folder =
    documentType === "invoice" ? "invoices" : documentType === "receipt" ? "receipts" : "contracts";
  const path = buildFinanceDocumentPath(access.clubId, folder, docId, file.name);

  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage.from("club-assets").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { error: uploadError.message };

  const amount = readAmount(formData, "amount");
  const { data, error } = await supabase
    .from("finance_documents")
    .insert({
      id: docId,
      club_id: access.clubId,
      document_type: documentType,
      title,
      storage_path: path,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      issue_date: readString(formData, "issueDate") || null,
      amount,
      uploaded_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się zapisać dokumentu." };
  revalidateFinancePaths();
  return { success: "Dokument dodany.", id: data.id };
}

export async function generateFinanceReport(
  _prev: FinanceActionState,
  formData: FormData,
): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const periodType = readString(formData, "periodType") as FinanceReportPeriod;
  const periodStart = readString(formData, "periodStart");
  const periodEnd = readString(formData, "periodEnd");
  const title = readString(formData, "title");
  if (!periodType || !periodStart || !periodEnd || !title) return { error: "Uzupełnij okres raportu." };
  if (periodEnd < periodStart) return { error: "Data końca okresu nie może być wcześniejsza niż początek." };

  const club = await getClub(access.clubId);
  const clubName = club ? getClubBrandingName(club) : "Klub";
  const content = await buildFinanceReportContent(access.clubId, periodStart, periodEnd, clubName);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("finance_reports")
    .insert({
      club_id: access.clubId,
      title,
      period_type: periodType,
      period_start: periodStart,
      period_end: periodEnd,
      content,
      generated_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się wygenerować raportu." };
  revalidateFinancePaths();
  return { success: "Raport wygenerowany.", id: data.id };
}

export async function publishFinanceReport(reportId: string): Promise<FinanceActionState> {
  const access = await requireAccessContext();
  if (!canManageFinance(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("finance_reports")
    .update({ status: "published" })
    .eq("id", reportId)
    .eq("club_id", access.clubId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidateFinancePaths();
  return { success: "Raport opublikowany." };
}

export async function getFinanceDocumentSignedUrl(storagePath: string): Promise<string | null> {
  const access = await requireAccessContext();
  if (!canReadFinance(access.roles)) return null;
  if (!storagePath.startsWith(`${access.clubId}/finance/`)) return null;

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("finance_documents")
    .select("id")
    .eq("club_id", access.clubId)
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (!document) return null;

  const { data } = await supabase.storage.from("club-assets").createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}
