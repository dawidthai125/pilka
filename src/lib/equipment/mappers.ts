import type {
  AssetAssignmentRow,
  AssetCategoryRow,
  AssetMaintenanceRow,
  AssetRow,
  EquipmentKitHistoryRow,
  EquipmentKitRow,
} from "@/types/equipment";
import {
  ASSET_ASSIGNEE_KINDS,
  ASSET_CONDITIONS,
  ASSET_MAINTENANCE_STATUSES,
  ASSET_MAINTENANCE_TYPES,
  EQUIPMENT_KIT_TYPES,
} from "@/types/equipment";

function str(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return v == null ? null : String(v);
}

function num(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  if (v == null) return null;
  return Number(v);
}

export function mapAssetCategory(row: Record<string, unknown>): AssetCategoryRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function mapAsset(row: Record<string, unknown>, categoryName?: string): AssetRow {
  return {
    id: String(row.id),
    categoryId: String(row.category_id),
    categoryName,
    name: String(row.name),
    inventoryNumber: str(row, "inventory_number"),
    description: str(row, "description"),
    purchaseDate: str(row, "purchase_date"),
    purchaseValue: num(row, "purchase_value"),
    condition: row.condition as AssetRow["condition"],
    location: str(row, "location"),
    quantity: Number(row.quantity ?? 0),
    quantityAvailable: Number(row.quantity_available ?? 0),
    isActive: Boolean(row.is_active ?? true),
    updatedAt: String(row.updated_at),
  };
}

export function mapAssetAssignment(row: Record<string, unknown>): AssetAssignmentRow {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    assetName: str(row, "asset_name") ?? undefined,
    assigneeKind: row.assignee_kind as AssetAssignmentRow["assigneeKind"],
    profileId: str(row, "profile_id"),
    playerId: str(row, "player_id"),
    assigneeLabel: str(row, "assignee_label"),
    quantity: Number(row.quantity ?? 1),
    issuedAt: String(row.issued_at),
    dueAt: str(row, "due_at"),
    returnedAt: str(row, "returned_at"),
    notes: str(row, "notes"),
  };
}

export function mapAssetMaintenance(row: Record<string, unknown>): AssetMaintenanceRow {
  return {
    id: String(row.id),
    assetId: String(row.asset_id),
    assetName: str(row, "asset_name") ?? undefined,
    maintenanceType: row.maintenance_type as AssetMaintenanceRow["maintenanceType"],
    status: row.status as AssetMaintenanceRow["status"],
    title: String(row.title),
    description: str(row, "description"),
    scheduledAt: str(row, "scheduled_at"),
    completedAt: str(row, "completed_at"),
    cost: num(row, "cost"),
  };
}

export function mapEquipmentKit(row: Record<string, unknown>): EquipmentKitRow {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    playerName: str(row, "player_name") ?? undefined,
    kitType: row.kit_type as EquipmentKitRow["kitType"],
    jerseyNumber: num(row, "jersey_number"),
    size: String(row.size),
    notes: str(row, "notes"),
    isActive: Boolean(row.is_active ?? true),
  };
}

export function mapEquipmentKitHistory(row: Record<string, unknown>): EquipmentKitHistoryRow {
  return {
    id: String(row.id),
    kitId: String(row.kit_id),
    fieldChanged: String(row.field_changed),
    oldValue: str(row, "old_value"),
    newValue: str(row, "new_value"),
    changedAt: String(row.changed_at),
  };
}

export function parseAssetCondition(raw: string) {
  return ASSET_CONDITIONS.includes(raw as (typeof ASSET_CONDITIONS)[number])
    ? (raw as (typeof ASSET_CONDITIONS)[number])
    : null;
}

export function parseAssetAssigneeKind(raw: string) {
  return ASSET_ASSIGNEE_KINDS.includes(raw as (typeof ASSET_ASSIGNEE_KINDS)[number])
    ? (raw as (typeof ASSET_ASSIGNEE_KINDS)[number])
    : null;
}

export function parseAssetMaintenanceType(raw: string) {
  return ASSET_MAINTENANCE_TYPES.includes(raw as (typeof ASSET_MAINTENANCE_TYPES)[number])
    ? (raw as (typeof ASSET_MAINTENANCE_TYPES)[number])
    : null;
}

export function parseAssetMaintenanceStatus(raw: string) {
  return ASSET_MAINTENANCE_STATUSES.includes(raw as (typeof ASSET_MAINTENANCE_STATUSES)[number])
    ? (raw as (typeof ASSET_MAINTENANCE_STATUSES)[number])
    : null;
}

export function parseEquipmentKitType(raw: string) {
  return EQUIPMENT_KIT_TYPES.includes(raw as (typeof EQUIPMENT_KIT_TYPES)[number])
    ? (raw as (typeof EQUIPMENT_KIT_TYPES)[number])
    : null;
}
