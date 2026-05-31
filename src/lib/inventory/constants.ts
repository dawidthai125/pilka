import type {
  InventoryDamageStatus,
  InventoryItemCategory,
  InventoryItemStatus,
  InventoryOrderStatus,
  InventoryRecipientType,
  InventoryReportType,
  InventoryReturnCondition,
  InventoryStocktakeStatus,
  InventoryStocktakeType,
} from "@/types/inventory";

export const INVENTORY_CATEGORY_LABELS: Record<InventoryItemCategory, string> = {
  match_kit: "Stroje meczowe",
  training_kit: "Stroje treningowe",
  tracksuit: "Dresy",
  balls: "Piłki",
  markers: "Znaczniki",
  cones: "Pachołki",
  training_goals: "Bramki treningowe",
  medical: "Sprzęt medyczny",
  strength: "Sprzęt siłowy",
  pitch: "Sprzęt boiskowy",
  electronics: "Elektronika",
  other: "Inne",
};

export const INVENTORY_ITEM_STATUS_LABELS: Record<InventoryItemStatus, string> = {
  available: "Dostępny",
  issued: "Wydany",
  damaged: "Uszkodzony",
  retired: "Wycofany",
};

export const INVENTORY_RECIPIENT_TYPE_LABELS: Record<InventoryRecipientType, string> = {
  player: "Zawodnik",
  coach: "Trener",
  team_manager: "Kierownik drużyny",
};

export const INVENTORY_RETURN_CONDITION_LABELS: Record<InventoryReturnCondition, string> = {
  functional: "Sprawny",
  damaged: "Uszkodzony",
  lost: "Zagubiony",
};

export const INVENTORY_DAMAGE_STATUS_LABELS: Record<InventoryDamageStatus, string> = {
  reported: "Zgłoszone",
  in_repair: "W naprawie",
  repaired: "Naprawione",
  replacement_needed: "Do wymiany",
};

export const INVENTORY_ORDER_STATUS_LABELS: Record<InventoryOrderStatus, string> = {
  draft: "Projekt",
  ordered: "Zamówione",
  in_progress: "W realizacji",
  delivered: "Dostarczone",
  cancelled: "Anulowane",
};

export const INVENTORY_STOCKTAKE_TYPE_LABELS: Record<InventoryStocktakeType, string> = {
  partial: "Częściowa",
  full: "Pełna",
};

export const INVENTORY_STOCKTAKE_STATUS_LABELS: Record<InventoryStocktakeStatus, string> = {
  in_progress: "W trakcie",
  completed: "Zakończona",
};

export const INVENTORY_REPORT_TYPE_LABELS: Record<InventoryReportType, string> = {
  stock_status: "Stan magazynu",
  issued_equipment: "Wydany sprzęt",
  damaged_equipment: "Uszkodzony sprzęt",
  issue_history: "Historia wydań",
};

export function inventoryStatusVariant(
  status: InventoryItemStatus,
): "default" | "secondary" | "destructive" {
  if (status === "available") return "default";
  if (status === "issued") return "secondary";
  if (status === "damaged") return "destructive";
  return "secondary";
}

export function formatMoney(amount: number): string {
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
  }).format(amount);
}
