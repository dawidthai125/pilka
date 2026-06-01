"use server";

import {
  canIssueEquipment,
  canManageEquipment,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import {
  notifyAssetDamaged,
  notifyAssetReturnOverdue,
} from "@/lib/equipment/dispatch";
import { generateEquipmentDraft } from "@/lib/equipment/generator";
import {
  parseAssetAssigneeKind,
  parseAssetCondition,
  parseAssetMaintenanceStatus,
  parseAssetMaintenanceType,
  parseEquipmentKitType,
} from "@/lib/equipment/mappers";
import { revalidateEquipmentPaths } from "@/lib/equipment/revalidate";
import { createClient } from "@/lib/supabase/server";
import type { EquipmentDraftKind } from "@/lib/equipment/generator";

export type EquipmentActionState = {
  error?: string;
  success?: string;
  draft?: { title: string; body: string };
};

function requireEquipmentManage(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canManageEquipment(access.roles)) return { error: "Brak uprawnień do zarządzania sprzętem." };
  return null;
}

function requireEquipmentIssue(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canIssueEquipment(access.roles)) return { error: "Brak uprawnień do wydań sprzętu." };
  return null;
}

export async function upsertAssetAction(
  _prev: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const access = await requireAccessContext();
  const denied = requireEquipmentManage(access);
  if (denied) return denied;

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const condition = parseAssetCondition(String(formData.get("condition") ?? "good"));
  if (!name || !categoryId || !condition) return { error: "Nazwa, kategoria i stan są wymagane." };

  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  const row = {
    club_id: access.clubId,
    category_id: categoryId,
    name,
    inventory_number: String(formData.get("inventoryNumber") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    purchase_date: String(formData.get("purchaseDate") ?? "").trim() || null,
    purchase_value: formData.get("purchaseValue")
      ? Number(formData.get("purchaseValue"))
      : null,
    condition,
    location: String(formData.get("location") ?? "").trim() || null,
    quantity,
    quantity_available: quantity,
    created_by: access.userId,
  };

  const supabase = await createClient();
  const assetId = String(formData.get("assetId") ?? "").trim();

  if (assetId) {
    const { error } = await supabase
      .from("assets")
      .update({
        category_id: row.category_id,
        name: row.name,
        inventory_number: row.inventory_number,
        description: row.description,
        purchase_date: row.purchase_date,
        purchase_value: row.purchase_value,
        condition: row.condition,
        location: row.location,
      })
      .eq("id", assetId)
      .eq("club_id", access.clubId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("assets").insert(row);
    if (error) return { error: error.message };
  }

  revalidateEquipmentPaths();
  return { success: assetId ? "Sprzęt zaktualizowany." : "Sprzęt dodany do rejestru." };
}

export async function issueAssetAction(
  _prev: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const access = await requireAccessContext();
  const denied = requireEquipmentIssue(access);
  if (denied) return denied;

  const assetId = String(formData.get("assetId") ?? "").trim();
  const assigneeKind = parseAssetAssigneeKind(String(formData.get("assigneeKind") ?? ""));
  const quantity = Math.max(1, Number(formData.get("quantity") ?? 1));
  if (!assetId || !assigneeKind) return { error: "Sprzęt i odbiorca są wymagane." };

  const profileId = String(formData.get("profileId") ?? "").trim() || null;
  const playerId = String(formData.get("playerId") ?? "").trim() || null;
  const assigneeLabel = String(formData.get("assigneeLabel") ?? "").trim() || null;
  const dueAt = String(formData.get("dueAt") ?? "").trim() || null;

  const supabase = await createClient();

  const { data: asset } = await supabase
    .from("assets")
    .select("quantity_available")
    .eq("id", assetId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!asset || Number(asset.quantity_available) < quantity) {
    return { error: "Niewystarczająca ilość dostępna w magazynie." };
  }

  const { error: assignError } = await supabase.from("asset_assignments").insert({
    club_id: access.clubId,
    asset_id: assetId,
    assignee_kind: assigneeKind,
    profile_id: profileId,
    player_id: playerId,
    assignee_label: assigneeLabel,
    quantity,
    due_at: dueAt ? new Date(dueAt).toISOString() : null,
    issued_by: access.userId,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (assignError) return { error: assignError.message };

  await supabase
    .from("assets")
    .update({ quantity_available: Number(asset.quantity_available) - quantity })
    .eq("id", assetId)
    .eq("club_id", access.clubId);

  revalidateEquipmentPaths();
  return { success: "Sprzęt wydany." };
}

export async function returnAssetAction(assignmentId: string): Promise<EquipmentActionState> {
  const access = await requireAccessContext();
  const denied = requireEquipmentIssue(access);
  if (denied) return denied;

  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("asset_assignments")
    .select("asset_id, quantity, returned_at")
    .eq("id", assignmentId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!assignment) return { error: "Wydanie nie znalezione." };
  if (assignment.returned_at) return { error: "Sprzęt już zwrócony." };

  const assetId = String(assignment.asset_id);
  const qty = Number(assignment.quantity);

  const { data: asset } = await supabase
    .from("assets")
    .select("quantity_available")
    .eq("id", assetId)
    .maybeSingle();

  const { error } = await supabase
    .from("asset_assignments")
    .update({ returned_at: new Date().toISOString(), returned_by: access.userId })
    .eq("id", assignmentId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };

  if (asset) {
    await supabase
      .from("assets")
      .update({
        quantity_available: Number(asset.quantity_available) + qty,
      })
      .eq("id", assetId);
  }

  revalidateEquipmentPaths();
  return { success: "Zwrot zarejestrowany." };
}

export async function reportMaintenanceAction(
  _prev: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const access = await requireAccessContext();
  const denied = requireEquipmentIssue(access);
  if (denied) return denied;

  const assetId = String(formData.get("assetId") ?? "").trim();
  const maintenanceType = parseAssetMaintenanceType(String(formData.get("maintenanceType") ?? ""));
  const title = String(formData.get("title") ?? "").trim();
  if (!assetId || !maintenanceType || !title) return { error: "Wypełnij wymagane pola." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("asset_maintenance")
    .insert({
      club_id: access.clubId,
      asset_id: assetId,
      maintenance_type: maintenanceType,
      title,
      description: String(formData.get("description") ?? "").trim() || null,
      scheduled_at: String(formData.get("scheduledAt") ?? "").trim() || null,
      reported_by: access.userId,
    })
    .select("id, assets(name)")
    .single();

  if (error) return { error: error.message };

  const row = data as { id: string; assets: { name?: string } | null };
  const assetName = row.assets?.name ?? "Sprzęt";
  const notifyIds = await getEquipmentManagerUserIds(access.clubId);
  await notifyAssetDamaged(access.clubId, notifyIds, assetName, row.id);

  if (maintenanceType === "repair") {
    await supabase
      .from("assets")
      .update({ condition: "damaged" })
      .eq("id", assetId)
      .eq("club_id", access.clubId);
  }

  revalidateEquipmentPaths();
  return { success: "Zgłoszenie konserwacji utworzone." };
}

export async function updateMaintenanceStatusAction(
  maintenanceId: string,
  statusRaw: string,
): Promise<EquipmentActionState> {
  const access = await requireAccessContext();
  if (!canManageEquipment(access.roles) && !canIssueEquipment(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  const status = parseAssetMaintenanceStatus(statusRaw);
  if (!status) return { error: "Nieprawidłowy status." };

  const supabase = await createClient();
  const patch: Record<string, unknown> = { status };
  if (status === "completed") patch.completed_at = new Date().toISOString();

  const { error } = await supabase
    .from("asset_maintenance")
    .update(patch)
    .eq("id", maintenanceId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateEquipmentPaths();
  return { success: "Status zaktualizowany." };
}

export async function upsertEquipmentKitAction(
  _prev: EquipmentActionState,
  formData: FormData,
): Promise<EquipmentActionState> {
  const access = await requireAccessContext();
  const denied = requireEquipmentManage(access);
  if (denied) return denied;

  const playerId = String(formData.get("playerId") ?? "").trim();
  const kitType = parseEquipmentKitType(String(formData.get("kitType") ?? ""));
  const size = String(formData.get("size") ?? "").trim();
  if (!playerId || !kitType || !size) return { error: "Zawodnik, typ stroju i rozmiar są wymagane." };

  const jerseyRaw = String(formData.get("jerseyNumber") ?? "").trim();
  const jerseyNumber = jerseyRaw ? Number(jerseyRaw) : null;

  const supabase = await createClient();
  const kitId = String(formData.get("kitId") ?? "").trim();

  const row = {
    club_id: access.clubId,
    player_id: playerId,
    kit_type: kitType,
    jersey_number: jerseyNumber,
    size,
    notes: String(formData.get("notes") ?? "").trim() || null,
    created_by: access.userId,
  };

  const { error } = kitId
    ? await supabase.from("equipment_kits").update(row).eq("id", kitId).eq("club_id", access.clubId)
    : await supabase.from("equipment_kits").insert(row);

  if (error) return { error: error.message };
  revalidateEquipmentPaths();
  return { success: kitId ? "Strój zaktualizowany." : "Strój przypisany." };
}

export async function generateEquipmentDraftAction(
  kind: EquipmentDraftKind,
): Promise<EquipmentActionState> {
  const access = await requireAccessContext();
  const denied = requireEquipmentManage(access);
  if (denied) return denied;

  const { getAssets, getAssetMaintenanceList, getEquipmentDashboardStats } = await import(
    "@/lib/equipment/loaders"
  );
  const { generateEquipmentInsights } = await import("@/lib/equipment/insights");

  const [stats, assets, maintenance] = await Promise.all([
    getEquipmentDashboardStats(access.clubId),
    getAssets(access.clubId),
    getAssetMaintenanceList(access.clubId),
  ]);

  const insights = generateEquipmentInsights(stats, assets, maintenance);
  const draft = generateEquipmentDraft(kind, insights);
  return { draft: { title: draft.title, body: draft.body }, success: "Szkic wygenerowany." };
}

export async function checkOverdueReturnsAction(): Promise<void> {
  const access = await requireAccessContext();
  if (!canManageEquipment(access.roles)) return;

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("asset_assignments")
    .select("id, profile_id, assets(name)")
    .eq("club_id", access.clubId)
    .is("returned_at", null)
    .lt("due_at", now)
    .not("profile_id", "is", null);

  for (const row of data ?? []) {
    const profileId = row.profile_id ? String(row.profile_id) : null;
    if (!profileId) continue;
    const assetName = (row.assets as { name?: string } | null)?.name ?? "Sprzęt";
    await notifyAssetReturnOverdue(access.clubId, profileId, String(row.id), assetName);
  }
}

async function getEquipmentManagerUserIds(clubId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("role", ["owner", "president", "sports_director"]);
  return (data ?? []).map((r) => String(r.user_id));
}
