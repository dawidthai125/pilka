import type {
  InventoryCategory,
  InventoryDamage,
  InventoryItem,
  InventoryKitAssignment,
  InventoryPlayerKit,
  InventoryPurchaseOrder,
  InventoryReport,
  InventoryReturn,
  InventoryStocktake,
  InventorySupplier,
  InventoryTransaction,
} from "@/types/inventory";

function str(row: Record<string, unknown>, key: string): string {
  return String(row[key] ?? "");
}

function optStr(row: Record<string, unknown>, key: string): string | null {
  const v = row[key];
  return v == null || v === "" ? null : String(v);
}

function num(row: Record<string, unknown>, key: string): number {
  return Number(row[key] ?? 0);
}

function optNum(row: Record<string, unknown>, key: string): number | null {
  const v = row[key];
  return v == null ? null : Number(v);
}

function nestedName(
  row: Record<string, unknown>,
  key: string,
  firstKey = "first_name",
  lastKey = "last_name",
): string | null {
  const nested = row[key] as { [k: string]: unknown } | null;
  if (!nested) return null;
  return `${nested[firstKey] ?? ""} ${nested[lastKey] ?? ""}`.trim() || null;
}

export function mapInventoryCategory(row: Record<string, unknown>): InventoryCategory {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    slug: str(row, "slug") as InventoryCategory["slug"],
    name: str(row, "name"),
    sortOrder: num(row, "sort_order"),
  };
}

export function mapInventorySupplier(row: Record<string, unknown>): InventorySupplier {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    name: str(row, "name"),
    contactName: optStr(row, "contact_name"),
    phone: optStr(row, "phone"),
    email: optStr(row, "email"),
    address: optStr(row, "address"),
    notes: optStr(row, "notes"),
  };
}

export function mapInventoryItem(row: Record<string, unknown>): InventoryItem {
  const category = row.category as { slug?: string; name?: string } | null;
  const supplier = row.supplier as { name?: string } | null;
  const minStock = num(row, "min_stock_level");
  const available = num(row, "quantity_available");

  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    categoryId: str(row, "category_id"),
    categorySlug: (category?.slug as InventoryItem["categorySlug"]) ?? null,
    categoryName: category?.name ?? null,
    name: str(row, "name"),
    inventoryNumber: str(row, "inventory_number"),
    internalCode: optStr(row, "internal_code"),
    photoPath: optStr(row, "photo_path"),
    description: optStr(row, "description"),
    purchaseDate: optStr(row, "purchase_date"),
    purchasePrice: optNum(row, "purchase_price"),
    supplierId: optStr(row, "supplier_id"),
    supplierName: supplier?.name ?? null,
    status: str(row, "status") as InventoryItem["status"],
    quantityTotal: num(row, "quantity_total"),
    quantityAvailable: available,
    quantityIssued: num(row, "quantity_issued"),
    quantityDamaged: num(row, "quantity_damaged"),
    minStockLevel: minStock,
    isLowStock: minStock > 0 && available <= minStock,
  };
}

export function mapInventoryTransaction(row: Record<string, unknown>): InventoryTransaction {
  const item = row.item as { name?: string } | null;
  const issuer = row.issuer as { full_name?: string } | null;
  const profile = row.profile as { full_name?: string } | null;

  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    itemId: str(row, "item_id"),
    itemName: item?.name ?? null,
    recipientType: str(row, "recipient_type") as InventoryTransaction["recipientType"],
    playerId: optStr(row, "player_id"),
    playerName: nestedName(row, "player"),
    profileId: optStr(row, "profile_id"),
    profileName: profile?.full_name ?? null,
    quantity: num(row, "quantity"),
    issueDate: str(row, "issue_date"),
    expectedReturnDate: optStr(row, "expected_return_date"),
    notes: optStr(row, "notes"),
    issuedByName: issuer?.full_name ?? null,
  };
}

export function mapInventoryReturn(row: Record<string, unknown>): InventoryReturn {
  const item = row.item as { name?: string } | null;
  const recorder = row.recorder as { full_name?: string } | null;

  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    transactionId: optStr(row, "transaction_id"),
    itemId: str(row, "item_id"),
    itemName: item?.name ?? null,
    returnDate: str(row, "return_date"),
    quantity: num(row, "quantity"),
    condition: str(row, "condition") as InventoryReturn["condition"],
    notes: optStr(row, "notes"),
    recordedByName: recorder?.full_name ?? null,
  };
}

export function mapInventoryDamage(row: Record<string, unknown>): InventoryDamage {
  const item = row.item as { name?: string } | null;
  const reporter = row.reporter as { full_name?: string } | null;

  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    itemId: str(row, "item_id"),
    itemName: item?.name ?? null,
    description: str(row, "description"),
    photoPath: optStr(row, "photo_path"),
    damageDate: str(row, "damage_date"),
    status: str(row, "status") as InventoryDamage["status"],
    reportedByName: reporter?.full_name ?? null,
  };
}

export function mapInventoryPlayerKit(row: Record<string, unknown>): InventoryPlayerKit {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    playerName: nestedName(row, "player"),
    jerseyNumber: optNum(row, "jersey_number"),
    jerseySize: optStr(row, "jersey_size"),
    shortsSize: optStr(row, "shorts_size"),
    tracksuitSize: optStr(row, "tracksuit_size"),
    notes: optStr(row, "notes"),
  };
}

export function mapInventoryKitAssignment(row: Record<string, unknown>): InventoryKitAssignment {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    playerName: nestedName(row, "player"),
    itemId: optStr(row, "item_id"),
    kitName: str(row, "kit_name"),
    assignedDate: str(row, "assigned_date"),
    returnedDate: optStr(row, "returned_date"),
    notes: optStr(row, "notes"),
  };
}

export function mapInventoryStocktake(row: Record<string, unknown>): InventoryStocktake {
  const conductor = row.conductor as { full_name?: string } | null;
  const lines = row.lines as Array<{ difference?: number }> | null;

  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    name: str(row, "name"),
    stocktakeType: str(row, "stocktake_type") as InventoryStocktake["stocktakeType"],
    status: str(row, "status") as InventoryStocktake["status"],
    startedAt: str(row, "started_at"),
    completedAt: optStr(row, "completed_at"),
    conductedByName: conductor?.full_name ?? null,
    notes: optStr(row, "notes"),
    linesCount: lines?.length ?? num(row, "lines_count"),
    discrepancyCount: lines?.filter((l) => Number(l.difference) !== 0).length ?? 0,
  };
}

export function mapInventoryPurchaseOrder(row: Record<string, unknown>): InventoryPurchaseOrder {
  const supplier = row.supplier as { name?: string } | null;
  const lines = row.lines as unknown[] | null;

  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    supplierId: optStr(row, "supplier_id"),
    supplierName: supplier?.name ?? null,
    orderNumber: str(row, "order_number"),
    status: str(row, "status") as InventoryPurchaseOrder["status"],
    orderDate: str(row, "order_date"),
    expectedDelivery: optStr(row, "expected_delivery"),
    notes: optStr(row, "notes"),
    linesCount: lines?.length ?? num(row, "lines_count"),
  };
}

export function mapInventoryReport(row: Record<string, unknown>): InventoryReport {
  const generator = row.generator as { full_name?: string } | null;

  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    title: str(row, "title"),
    reportType: str(row, "report_type") as InventoryReport["reportType"],
    periodStart: optStr(row, "period_start"),
    periodEnd: optStr(row, "period_end"),
    content: (row.content as InventoryReport["content"]) ?? {},
    status: str(row, "status") as InventoryReport["status"],
    generatedByName: generator?.full_name ?? null,
    createdAt: str(row, "created_at"),
  };
}
