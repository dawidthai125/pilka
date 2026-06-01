import { cache } from "react";

import {
  mapAsset,
  mapAssetAssignment,
  mapAssetCategory,
  mapAssetMaintenance,
  mapEquipmentKit,
  mapEquipmentKitHistory,
} from "@/lib/equipment/mappers";
import { createClient } from "@/lib/supabase/server";
import type {
  AssetAssignmentRow,
  AssetCategoryRow,
  AssetMaintenanceRow,
  AssetRow,
  EquipmentDashboardStats,
  EquipmentKitHistoryRow,
  EquipmentKitRow,
} from "@/types/equipment";
import type { AssetCondition } from "@/types/equipment";

export const getEquipmentCategories = cache(
  async (clubId: string): Promise<AssetCategoryRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("asset_categories")
      .select("*")
      .eq("club_id", clubId)
      .order("sort_order");
    return (data ?? []).map((row) => mapAssetCategory(row as Record<string, unknown>));
  },
);

export const getEquipmentDashboardStats = cache(
  async (clubId: string): Promise<EquipmentDashboardStats> => {
    const supabase = await createClient();

    const [active, repair, loaned, values] = await Promise.all([
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("is_active", true),
      supabase
        .from("assets")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("is_active", true)
        .in("condition", ["needs_repair", "damaged"]),
      supabase
        .from("asset_assignments")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .is("returned_at", null),
      supabase
        .from("assets")
        .select("purchase_value, quantity")
        .eq("club_id", clubId)
        .eq("is_active", true),
    ]);

    const totalValue = (values.data ?? []).reduce(
      (sum, row) => sum + Number(row.purchase_value ?? 0) * Number(row.quantity ?? 1),
      0,
    );

    return {
      activeAssets: active.count ?? 0,
      needsRepair: repair.count ?? 0,
      loanedOut: loaned.count ?? 0,
      totalValue,
    };
  },
);

export const getAssets = cache(
  async (
    clubId: string,
    filters?: { categoryId?: string; condition?: AssetCondition; location?: string },
  ): Promise<AssetRow[]> => {
    const supabase = await createClient();
    const categories = await getEquipmentCategories(clubId);
    const catMap = new Map(categories.map((c) => [c.id, c.name]));

    let query = supabase
      .from("assets")
      .select("*")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("updated_at", { ascending: false });

    if (filters?.categoryId) query = query.eq("category_id", filters.categoryId);
    if (filters?.condition) query = query.eq("condition", filters.condition);
    if (filters?.location) query = query.ilike("location", `%${filters.location}%`);

    const { data } = await query;
    return (data ?? []).map((row) =>
      mapAsset(row as Record<string, unknown>, catMap.get(String(row.category_id))),
    );
  },
);

export const getAssetDetail = cache(
  async (
    clubId: string,
    assetId: string,
  ): Promise<{
    asset: AssetRow;
    assignments: AssetAssignmentRow[];
    maintenance: AssetMaintenanceRow[];
  } | null> => {
    const supabase = await createClient();
    const { data: assetRow } = await supabase
      .from("assets")
      .select("*")
      .eq("club_id", clubId)
      .eq("id", assetId)
      .maybeSingle();
    if (!assetRow) return null;

    const categories = await getEquipmentCategories(clubId);
    const cat = categories.find((c) => c.id === String(assetRow.category_id));

    const [assignments, maintenance] = await Promise.all([
      supabase
        .from("asset_assignments")
        .select("*")
        .eq("asset_id", assetId)
        .order("issued_at", { ascending: false }),
      supabase
        .from("asset_maintenance")
        .select("*")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false }),
    ]);

    return {
      asset: mapAsset(assetRow as Record<string, unknown>, cat?.name),
      assignments: (assignments.data ?? []).map((row) =>
        mapAssetAssignment(row as Record<string, unknown>),
      ),
      maintenance: (maintenance.data ?? []).map((row) =>
        mapAssetMaintenance(row as Record<string, unknown>),
      ),
    };
  },
);

export const getAssetAssignments = cache(
  async (clubId: string, openOnly = false): Promise<AssetAssignmentRow[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("asset_assignments")
      .select("*, assets(name)")
      .eq("club_id", clubId)
      .order("issued_at", { ascending: false });
    if (openOnly) query = query.is("returned_at", null);

    const { data } = await query;
    return (data ?? []).map((row) => {
      const assets = row.assets as { name?: string } | null;
      return mapAssetAssignment({
        ...(row as Record<string, unknown>),
        asset_name: assets?.name,
      });
    });
  },
);

export const getAssetMaintenanceList = cache(
  async (clubId: string): Promise<AssetMaintenanceRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("asset_maintenance")
      .select("*, assets(name)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    return (data ?? []).map((row) => {
      const assets = row.assets as { name?: string } | null;
      return mapAssetMaintenance({
        ...(row as Record<string, unknown>),
        asset_name: assets?.name,
      });
    });
  },
);

export const getEquipmentKits = cache(async (clubId: string): Promise<EquipmentKitRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("equipment_kits")
    .select("*, players(first_name, last_name)")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false });

  return (data ?? []).map((row) => {
    const player = row.players as { first_name?: string; last_name?: string } | null;
    const playerName = player
      ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim()
      : undefined;
    return mapEquipmentKit({
      ...(row as Record<string, unknown>),
      player_name: playerName,
    });
  });
});

export const getEquipmentKitHistory = cache(
  async (clubId: string, kitId: string): Promise<EquipmentKitHistoryRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("equipment_kit_history")
      .select("*")
      .eq("club_id", clubId)
      .eq("kit_id", kitId)
      .order("changed_at", { ascending: false });
    return (data ?? []).map((row) => mapEquipmentKitHistory(row as Record<string, unknown>));
  },
);

export const getPortalEquipment = cache(
  async (
    clubId: string,
  ): Promise<{ assignments: AssetAssignmentRow[]; kits: EquipmentKitRow[] }> => {
    const [assignments, kits] = await Promise.all([
      getAssetAssignments(clubId, true),
      getEquipmentKits(clubId),
    ]);
    return { assignments, kits };
  },
);
