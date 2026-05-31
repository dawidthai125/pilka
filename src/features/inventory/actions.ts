"use server";

import { revalidatePath } from "next/cache";

import {
  canIssueInventory,
  canManageInventory,
  canReadInventory,
} from "@/config/permissions";
import { getClub, requireAccessContext } from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";
import { buildInventoryReportContent } from "@/lib/inventory/insights";
import { buildInventoryPhotoPath, validateInventoryPhoto } from "@/lib/inventory/uploads";
import { createClient } from "@/lib/supabase/server";
import type {
  InventoryDamageStatus,
  InventoryOrderStatus,
  InventoryRecipientType,
  InventoryReportType,
  InventoryReturnCondition,
  InventoryStocktakeType,
} from "@/types/inventory";

export type InventoryActionState = { error?: string; success?: string; id?: string };

function revalidateInventoryPaths() {
  const paths = [
    "/inventory",
    "/inventory/items",
    "/inventory/issues",
    "/inventory/returns",
    "/inventory/damages",
    "/inventory/kits",
    "/inventory/stocktakes",
    "/inventory/suppliers",
    "/inventory/orders",
    "/inventory/reports",
    "/inventory/portal",
  ];
  for (const path of paths) revalidatePath(path);
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readInt(formData: FormData, key: string): number | null {
  const value = Number(readString(formData, key));
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function readAmount(formData: FormData, key: string): number | null {
  const raw = readString(formData, key).replace(",", ".");
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export async function createInventoryItem(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canManageInventory(access.roles)) return { error: "Brak uprawnień." };

  const categoryId = readString(formData, "categoryId");
  const name = readString(formData, "name");
  const inventoryNumber = readString(formData, "inventoryNumber");
  const quantity = readInt(formData, "quantity");
  if (!categoryId || !name || !inventoryNumber || quantity === null || quantity < 1) {
    return { error: "Uzupełnij wymagane pola (ilość min. 1)." };
  }

  const itemId = crypto.randomUUID();
  const supabase = await createClient();

  let photoPath: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    const validation = validateInventoryPhoto(file);
    if (validation) return { error: validation };
    photoPath = buildInventoryPhotoPath(access.clubId, itemId, file.name);
    const { error: uploadError } = await supabase.storage.from("club-assets").upload(photoPath, file, {
      contentType: file.type,
      upsert: true,
    });
    if (uploadError) return { error: uploadError.message };
  }

  const { error } = await supabase.from("inventory_items").insert({
    id: itemId,
    club_id: access.clubId,
    category_id: categoryId,
    name,
    inventory_number: inventoryNumber,
    internal_code: readString(formData, "internalCode") || null,
    photo_path: photoPath,
    description: readString(formData, "description") || null,
    purchase_date: readString(formData, "purchaseDate") || null,
    purchase_price: readAmount(formData, "purchasePrice"),
    supplier_id: readString(formData, "supplierId") || null,
    quantity_total: quantity,
    quantity_available: quantity,
    quantity_issued: 0,
    quantity_damaged: 0,
    min_stock_level: readInt(formData, "minStockLevel") ?? 0,
  });

  if (error) return { error: error.message };
  revalidateInventoryPaths();
  return { success: "Pozycja magazynowa dodana.", id: itemId };
}

export async function issueInventoryItem(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canIssueInventory(access.roles)) return { error: "Brak uprawnień." };

  const itemId = readString(formData, "itemId");
  const recipientType = readString(formData, "recipientType") as InventoryRecipientType;
  const quantity = readInt(formData, "quantity");
  const issueDate = readString(formData, "issueDate") || new Date().toISOString().slice(0, 10);
  if (!itemId || !recipientType || !quantity || quantity < 1) {
    return { error: "Podaj sprzęt, odbiorcę i ilość." };
  }

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("inventory_items")
    .select("id, quantity_available")
    .eq("id", itemId)
    .eq("club_id", access.clubId)
    .maybeSingle();
  if (!item) return { error: "Nie znaleziono pozycji." };
  if (Number(item.quantity_available) < quantity) {
    return { error: "Niewystarczająca ilość dostępna." };
  }

  let playerId: string | null = null;
  let profileId: string | null = null;
  if (recipientType === "player") {
    playerId = readString(formData, "playerId");
    if (!playerId) return { error: "Wybierz zawodnika." };
    const { data: player } = await supabase
      .from("players")
      .select("id")
      .eq("id", playerId)
      .eq("club_id", access.clubId)
      .maybeSingle();
    if (!player) return { error: "Nieprawidłowy zawodnik." };
  } else {
    profileId = readString(formData, "profileId") || access.userId;
  }

  const { error } = await supabase.from("inventory_transactions").insert({
    club_id: access.clubId,
    item_id: itemId,
    recipient_type: recipientType,
    player_id: playerId,
    profile_id: profileId,
    quantity,
    issue_date: issueDate,
    expected_return_date: readString(formData, "expectedReturnDate") || null,
    notes: readString(formData, "notes") || null,
    issued_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateInventoryPaths();
  return { success: "Sprzęt wydany." };
}

export async function returnInventoryItem(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canIssueInventory(access.roles)) return { error: "Brak uprawnień." };

  const itemId = readString(formData, "itemId");
  const quantity = readInt(formData, "quantity");
  const condition = readString(formData, "condition") as InventoryReturnCondition;
  if (!itemId || !quantity || quantity < 1 || !condition) {
    return { error: "Podaj sprzęt, ilość i stan zwrotu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_returns").insert({
    club_id: access.clubId,
    item_id: itemId,
    transaction_id: readString(formData, "transactionId") || null,
    quantity,
    return_date: readString(formData, "returnDate") || new Date().toISOString().slice(0, 10),
    condition,
    notes: readString(formData, "notes") || null,
    recorded_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateInventoryPaths();
  return { success: "Zwrot zarejestrowany." };
}

export async function registerInventoryDamage(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canIssueInventory(access.roles)) return { error: "Brak uprawnień." };

  const itemId = readString(formData, "itemId");
  const description = readString(formData, "description");
  if (!itemId || !description) return { error: "Podaj sprzęt i opis uszkodzenia." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_damages").insert({
    club_id: access.clubId,
    item_id: itemId,
    description,
    damage_date: readString(formData, "damageDate") || new Date().toISOString().slice(0, 10),
    status: (readString(formData, "status") || "reported") as InventoryDamageStatus,
    reported_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateInventoryPaths();
  return { success: "Uszkodzenie zgłoszone." };
}

export async function upsertInventoryPlayerKit(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canManageInventory(access.roles)) return { error: "Brak uprawnień." };

  const playerId = readString(formData, "playerId");
  if (!playerId) return { error: "Wybierz zawodnika." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_player_kits").upsert(
    {
      club_id: access.clubId,
      player_id: playerId,
      jersey_number: readInt(formData, "jerseyNumber"),
      jersey_size: readString(formData, "jerseySize") || null,
      shorts_size: readString(formData, "shortsSize") || null,
      tracksuit_size: readString(formData, "tracksuitSize") || null,
      notes: readString(formData, "notes") || null,
    },
    { onConflict: "club_id,player_id" },
  );

  if (error) return { error: error.message };
  revalidateInventoryPaths();
  return { success: "Dane stroju zapisane." };
}

export async function createInventorySupplier(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canManageInventory(access.roles)) return { error: "Brak uprawnień." };

  const name = readString(formData, "name");
  if (!name) return { error: "Podaj nazwę dostawcy." };

  const supabase = await createClient();
  const { error } = await supabase.from("inventory_suppliers").insert({
    club_id: access.clubId,
    name,
    contact_name: readString(formData, "contactName") || null,
    phone: readString(formData, "phone") || null,
    email: readString(formData, "email") || null,
    address: readString(formData, "address") || null,
  });

  if (error) return { error: error.message };
  revalidateInventoryPaths();
  return { success: "Dostawca dodany." };
}

export async function createInventoryStocktake(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canManageInventory(access.roles)) return { error: "Brak uprawnień." };

  const name = readString(formData, "name");
  const stocktakeType = readString(formData, "stocktakeType") as InventoryStocktakeType;
  if (!name || !stocktakeType) return { error: "Podaj nazwę i typ inwentaryzacji." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_stocktakes")
    .insert({
      club_id: access.clubId,
      name,
      stocktake_type: stocktakeType,
      conducted_by: access.userId,
      notes: readString(formData, "notes") || null,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się utworzyć inwentaryzacji." };

  const { data: items } = await supabase
    .from("inventory_items")
    .select("id, quantity_total")
    .eq("club_id", access.clubId)
    .limit(stocktakeType === "partial" ? 30 : 500);

  if (items?.length) {
    await supabase.from("inventory_stocktake_lines").insert(
      items.map((item) => ({
        club_id: access.clubId,
        stocktake_id: data.id,
        item_id: item.id,
        system_quantity: item.quantity_total,
        actual_quantity: item.quantity_total,
      })),
    );
  }

  revalidateInventoryPaths();
  return { success: "Inwentaryzacja rozpoczęta.", id: data.id };
}

export async function createInventoryPurchaseOrder(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canManageInventory(access.roles)) return { error: "Brak uprawnień." };

  const orderNumber = readString(formData, "orderNumber");
  const description = readString(formData, "description");
  const quantity = readInt(formData, "quantity");
  if (!orderNumber || !description || !quantity) return { error: "Uzupełnij dane zamówienia." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_purchase_orders")
    .insert({
      club_id: access.clubId,
      supplier_id: readString(formData, "supplierId") || null,
      order_number: orderNumber,
      status: (readString(formData, "status") || "draft") as InventoryOrderStatus,
      order_date: readString(formData, "orderDate") || new Date().toISOString().slice(0, 10),
      expected_delivery: readString(formData, "expectedDelivery") || null,
      notes: readString(formData, "notes") || null,
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się utworzyć zamówienia." };

  await supabase.from("inventory_purchase_order_lines").insert({
    club_id: access.clubId,
    order_id: data.id,
    description,
    quantity,
    unit_price: readAmount(formData, "unitPrice"),
  });

  revalidateInventoryPaths();
  return { success: "Zamówienie utworzone.", id: data.id };
}

export async function generateInventoryReport(
  _prev: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canManageInventory(access.roles)) return { error: "Brak uprawnień." };

  const title = readString(formData, "title");
  const reportType = readString(formData, "reportType") as InventoryReportType;
  const periodStart = readString(formData, "periodStart") || null;
  const periodEnd = readString(formData, "periodEnd") || null;
  if (!title || !reportType) return { error: "Uzupełnij tytuł i typ raportu." };
  if (periodStart && periodEnd && periodEnd < periodStart) {
    return { error: "Nieprawidłowy zakres dat." };
  }

  const club = await getClub(access.clubId);
  const clubName = club ? getClubBrandingName(club) : "Klub";
  const content = await buildInventoryReportContent(
    access.clubId,
    reportType,
    periodStart,
    periodEnd,
    clubName,
  );

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("inventory_reports")
    .insert({
      club_id: access.clubId,
      title,
      report_type: reportType,
      period_start: periodStart,
      period_end: periodEnd,
      content,
      generated_by: access.userId,
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się wygenerować raportu." };
  revalidateInventoryPaths();
  return { success: "Raport wygenerowany.", id: data.id };
}

export async function publishInventoryReport(reportId: string): Promise<InventoryActionState> {
  const access = await requireAccessContext();
  if (!canManageInventory(access.roles)) return { error: "Brak uprawnień." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_reports")
    .update({ status: "published" })
    .eq("id", reportId)
    .eq("club_id", access.clubId)
    .eq("status", "draft");

  if (error) return { error: error.message };
  revalidateInventoryPaths();
  return { success: "Raport opublikowany." };
}

export async function getInventoryPhotoSignedUrl(storagePath: string): Promise<string | null> {
  const access = await requireAccessContext();
  if (!canReadInventory(access.roles)) return null;
  if (!storagePath.startsWith(`${access.clubId}/inventory/`)) return null;

  const supabase = await createClient();
  const { data } = await supabase.storage.from("club-assets").createSignedUrl(storagePath, 3600);
  return data?.signedUrl ?? null;
}
