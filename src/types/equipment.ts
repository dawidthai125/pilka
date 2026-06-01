import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ClipboardList,
  LayoutDashboard,
  Package,
  Shirt,
  Warehouse,
  Wrench,
} from "lucide-react";

export const ASSET_CONDITIONS = [
  "new",
  "good",
  "needs_repair",
  "damaged",
  "retired",
] as const;
export type AssetCondition = (typeof ASSET_CONDITIONS)[number];

export const ASSET_MAINTENANCE_TYPES = ["repair", "inspection", "replacement"] as const;
export type AssetMaintenanceType = (typeof ASSET_MAINTENANCE_TYPES)[number];

export const ASSET_MAINTENANCE_STATUSES = ["reported", "in_progress", "completed"] as const;
export type AssetMaintenanceStatus = (typeof ASSET_MAINTENANCE_STATUSES)[number];

export const ASSET_ASSIGNEE_KINDS = ["coach", "player", "staff", "team_manager"] as const;
export type AssetAssigneeKind = (typeof ASSET_ASSIGNEE_KINDS)[number];

export const EQUIPMENT_KIT_TYPES = ["match_kit", "training_kit", "tracksuit"] as const;
export type EquipmentKitType = (typeof EQUIPMENT_KIT_TYPES)[number];

export const ASSET_CONDITION_LABELS: Record<AssetCondition, string> = {
  new: "Nowy",
  good: "Dobry",
  needs_repair: "Do naprawy",
  damaged: "Uszkodzony",
  retired: "Wycofany",
};

export const ASSET_MAINTENANCE_TYPE_LABELS: Record<AssetMaintenanceType, string> = {
  repair: "Naprawa",
  inspection: "Przegląd",
  replacement: "Wymiana",
};

export const ASSET_MAINTENANCE_STATUS_LABELS: Record<AssetMaintenanceStatus, string> = {
  reported: "Zgłoszone",
  in_progress: "W trakcie",
  completed: "Zakończone",
};

export const ASSET_ASSIGNEE_KIND_LABELS: Record<AssetAssigneeKind, string> = {
  coach: "Trener",
  player: "Zawodnik",
  staff: "Pracownik",
  team_manager: "Kierownik drużyny",
};

export const EQUIPMENT_KIT_TYPE_LABELS: Record<EquipmentKitType, string> = {
  match_kit: "Strój meczowy",
  training_kit: "Strój treningowy",
  tracksuit: "Dres",
};

export type AssetCategoryRow = {
  id: string;
  slug: string;
  name: string;
  sortOrder: number;
};

export type AssetRow = {
  id: string;
  categoryId: string;
  categoryName?: string;
  name: string;
  inventoryNumber: string | null;
  description: string | null;
  purchaseDate: string | null;
  purchaseValue: number | null;
  condition: AssetCondition;
  location: string | null;
  quantity: number;
  quantityAvailable: number;
  isActive: boolean;
  updatedAt: string;
};

export type AssetAssignmentRow = {
  id: string;
  assetId: string;
  assetName?: string;
  assigneeKind: AssetAssigneeKind;
  profileId: string | null;
  playerId: string | null;
  assigneeLabel: string | null;
  quantity: number;
  issuedAt: string;
  dueAt: string | null;
  returnedAt: string | null;
  notes: string | null;
};

export type AssetMaintenanceRow = {
  id: string;
  assetId: string;
  assetName?: string;
  maintenanceType: AssetMaintenanceType;
  status: AssetMaintenanceStatus;
  title: string;
  description: string | null;
  scheduledAt: string | null;
  completedAt: string | null;
  cost: number | null;
};

export type EquipmentKitRow = {
  id: string;
  playerId: string;
  playerName?: string;
  kitType: EquipmentKitType;
  jerseyNumber: number | null;
  size: string;
  notes: string | null;
  isActive: boolean;
};

export type EquipmentKitHistoryRow = {
  id: string;
  kitId: string;
  fieldChanged: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
};

export type EquipmentDashboardStats = {
  activeAssets: number;
  needsRepair: number;
  loanedOut: number;
  totalValue: number;
};

export type EquipmentAiInsight = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
};

export const EQUIPMENT_NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/equipment", label: "Przegląd", icon: LayoutDashboard },
  { href: "/equipment/assets", label: "Rejestr", icon: Package },
  { href: "/equipment/warehouse", label: "Magazyn", icon: Warehouse },
  { href: "/equipment/assignments", label: "Wydania", icon: ClipboardList },
  { href: "/equipment/kits", label: "Stroje", icon: Shirt },
  { href: "/equipment/maintenance", label: "Konserwacja", icon: Wrench },
  { href: "/equipment/ai", label: "AI Assistant", icon: Bot },
];

export const REVALIDATE_EQUIPMENT_PATHS = [
  "/equipment",
  "/equipment/assets",
  "/equipment/warehouse",
  "/equipment/assignments",
  "/equipment/kits",
  "/equipment/maintenance",
  "/equipment/portal",
  "/notifications",
];
