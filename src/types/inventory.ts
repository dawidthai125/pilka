export const INVENTORY_ITEM_CATEGORIES = [
  "match_kit",
  "training_kit",
  "tracksuit",
  "balls",
  "markers",
  "cones",
  "training_goals",
  "medical",
  "strength",
  "pitch",
  "electronics",
  "other",
] as const;

export type InventoryItemCategory = (typeof INVENTORY_ITEM_CATEGORIES)[number];

export const INVENTORY_ITEM_STATUSES = ["available", "issued", "damaged", "retired"] as const;
export type InventoryItemStatus = (typeof INVENTORY_ITEM_STATUSES)[number];

export const INVENTORY_RECIPIENT_TYPES = ["player", "coach", "team_manager"] as const;
export type InventoryRecipientType = (typeof INVENTORY_RECIPIENT_TYPES)[number];

export const INVENTORY_RETURN_CONDITIONS = ["functional", "damaged", "lost"] as const;
export type InventoryReturnCondition = (typeof INVENTORY_RETURN_CONDITIONS)[number];

export const INVENTORY_DAMAGE_STATUSES = [
  "reported",
  "in_repair",
  "repaired",
  "replacement_needed",
] as const;
export type InventoryDamageStatus = (typeof INVENTORY_DAMAGE_STATUSES)[number];

export const INVENTORY_ORDER_STATUSES = [
  "draft",
  "ordered",
  "in_progress",
  "delivered",
  "cancelled",
] as const;
export type InventoryOrderStatus = (typeof INVENTORY_ORDER_STATUSES)[number];

export const INVENTORY_STOCKTAKE_TYPES = ["partial", "full"] as const;
export type InventoryStocktakeType = (typeof INVENTORY_STOCKTAKE_TYPES)[number];

export const INVENTORY_STOCKTAKE_STATUSES = ["in_progress", "completed"] as const;
export type InventoryStocktakeStatus = (typeof INVENTORY_STOCKTAKE_STATUSES)[number];

export const INVENTORY_REPORT_TYPES = [
  "stock_status",
  "issued_equipment",
  "damaged_equipment",
  "issue_history",
] as const;
export type InventoryReportType = (typeof INVENTORY_REPORT_TYPES)[number];

export const INVENTORY_REPORT_STATUSES = ["draft", "published"] as const;
export type InventoryReportStatus = (typeof INVENTORY_REPORT_STATUSES)[number];

export type InventoryCategory = {
  id: string;
  clubId: string;
  slug: InventoryItemCategory;
  name: string;
  sortOrder: number;
};

export type InventorySupplier = {
  id: string;
  clubId: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

export type InventoryItem = {
  id: string;
  clubId: string;
  categoryId: string;
  categorySlug: InventoryItemCategory | null;
  categoryName: string | null;
  name: string;
  inventoryNumber: string;
  internalCode: string | null;
  photoPath: string | null;
  description: string | null;
  purchaseDate: string | null;
  purchasePrice: number | null;
  supplierId: string | null;
  supplierName: string | null;
  status: InventoryItemStatus;
  quantityTotal: number;
  quantityAvailable: number;
  quantityIssued: number;
  quantityDamaged: number;
  minStockLevel: number;
  isLowStock: boolean;
};

export type InventoryTransaction = {
  id: string;
  clubId: string;
  itemId: string;
  itemName: string | null;
  recipientType: InventoryRecipientType;
  playerId: string | null;
  playerName: string | null;
  profileId: string | null;
  profileName: string | null;
  quantity: number;
  issueDate: string;
  expectedReturnDate: string | null;
  notes: string | null;
  issuedByName: string | null;
};

export type InventoryReturn = {
  id: string;
  clubId: string;
  transactionId: string | null;
  itemId: string;
  itemName: string | null;
  returnDate: string;
  quantity: number;
  condition: InventoryReturnCondition;
  notes: string | null;
  recordedByName: string | null;
};

export type InventoryDamage = {
  id: string;
  clubId: string;
  itemId: string;
  itemName: string | null;
  description: string;
  photoPath: string | null;
  damageDate: string;
  status: InventoryDamageStatus;
  reportedByName: string | null;
};

export type InventoryPlayerKit = {
  id: string;
  clubId: string;
  playerId: string;
  playerName: string | null;
  jerseyNumber: number | null;
  jerseySize: string | null;
  shortsSize: string | null;
  tracksuitSize: string | null;
  notes: string | null;
};

export type InventoryKitAssignment = {
  id: string;
  clubId: string;
  playerId: string;
  playerName: string | null;
  itemId: string | null;
  kitName: string;
  assignedDate: string;
  returnedDate: string | null;
  notes: string | null;
};

export type InventoryStocktake = {
  id: string;
  clubId: string;
  name: string;
  stocktakeType: InventoryStocktakeType;
  status: InventoryStocktakeStatus;
  startedAt: string;
  completedAt: string | null;
  conductedByName: string | null;
  notes: string | null;
  linesCount: number;
  discrepancyCount: number;
};

export type InventoryPurchaseOrder = {
  id: string;
  clubId: string;
  supplierId: string | null;
  supplierName: string | null;
  orderNumber: string;
  status: InventoryOrderStatus;
  orderDate: string;
  expectedDelivery: string | null;
  notes: string | null;
  linesCount: number;
};

export type InventoryReportContent = {
  totalItems?: number;
  lowStockCount?: number;
  damagedCount?: number;
  issuedCount?: number;
  issuesCount?: number;
  ballsIssued?: number;
  kitsIssued?: number;
  damagesCount?: number;
  replacementNeeded?: number;
  narrative?: string;
};

export type InventoryReport = {
  id: string;
  clubId: string;
  title: string;
  reportType: InventoryReportType;
  periodStart: string | null;
  periodEnd: string | null;
  content: InventoryReportContent;
  status: InventoryReportStatus;
  generatedByName: string | null;
  createdAt: string;
};

export type InventoryAlert = {
  id: string;
  type: "low_stock" | "out_of_stock" | "no_balls" | "damaged" | "open_damage" | "open_order";
  severity: "warning" | "destructive";
  title: string;
  message: string;
  href?: string;
};

export type InventoryDashboardStats = {
  totalItems: number;
  totalQuantity: number;
  availableQuantity: number;
  issuedQuantity: number;
  damagedQuantity: number;
  lowStockCount: number;
  outOfStockCount: number;
  ballsAvailable: number;
  openDamagesCount: number;
  openOrdersCount: number;
  alerts: InventoryAlert[];
  recentIssues: InventoryTransaction[];
  recentDamages: InventoryDamage[];
};

export type PlayerInventoryPortalData = {
  playerId: string;
  playerName: string;
  kit: InventoryPlayerKit | null;
  assignments: InventoryKitAssignment[];
  issues: InventoryTransaction[];
  returns: InventoryReturn[];
};
