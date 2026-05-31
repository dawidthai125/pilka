import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CLUB_ID } from "@/lib/auth/session";
import type { InventoryReportContent } from "@/types/inventory";
import { generateAiReportContent, isOpenAiConfigured } from "@/integrations/openai";

export async function buildInventoryAiContext(clubId: string = DEFAULT_CLUB_ID) {
  const supabase = await createClient();

  const [itemsRes, damagesRes, kitsRes, playersRes] = await Promise.all([
    supabase
      .from("inventory_items")
      .select("name, quantity_available, min_stock_level, status, category:category_id(slug)")
      .eq("club_id", clubId)
      .order("name")
      .limit(200),
    supabase
      .from("inventory_damages")
      .select("description, status, item:item_id(name)")
      .eq("club_id", clubId)
      .in("status", ["reported", "in_repair", "replacement_needed"])
      .limit(30),
    supabase
      .from("inventory_player_kits")
      .select("player_id")
      .eq("club_id", clubId),
    supabase
      .from("players")
      .select("id, first_name, last_name, status")
      .eq("club_id", clubId)
      .eq("status", "active")
      .limit(100),
  ]);

  const items = (itemsRes.data ?? []) as Array<{
    name: string;
    quantity_available: number;
    min_stock_level: number;
    status: string;
    category: { slug?: string } | null;
  }>;
  const kitPlayerIds = new Set((kitsRes.data ?? []).map((k) => String(k.player_id)));
  const players = playersRes.data ?? [];

  const lowStockItems = items
    .filter((i) => Number(i.min_stock_level) > 0 && Number(i.quantity_available) <= Number(i.min_stock_level))
    .slice(0, 15)
    .map((i) => ({
      name: String(i.name),
      available: Number(i.quantity_available),
      minLevel: Number(i.min_stock_level),
    }));

  const ballsAvailable = items
    .filter((i) => {
      const cat = i.category as { slug?: string } | null;
      return cat?.slug === "balls";
    })
    .reduce((sum, i) => sum + Number(i.quantity_available), 0);

  const playersWithoutKit = players
    .filter((p) => !kitPlayerIds.has(String(p.id)))
    .slice(0, 15)
    .map((p) => ({ name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() }));

  return {
    summary: {
      totalItems: items.length,
      lowStockCount: lowStockItems.length,
      damagedCount: items.filter((i) => String(i.status) === "damaged").length,
      ballsAvailable,
    },
    lowStockItems,
    openDamages: (damagesRes.data ?? []).slice(0, 10).map((d) => {
      const row = d as { description: string; status: string; item: { name?: string } | null };
      return {
        item: row.item?.name ?? null,
        description: String(row.description),
        status: String(row.status),
      };
    }),
    playersWithoutKit,
  };
}

export async function buildInventoryReportContent(
  clubId: string,
  reportType: string,
  periodStart: string | null,
  periodEnd: string | null,
  clubName: string,
): Promise<InventoryReportContent> {
  const supabase = await createClient();

  const { data: summary } = await supabase.rpc("get_inventory_report_summary", {
    p_club_id: clubId,
    p_period_start: periodStart,
    p_period_end: periodEnd,
  });

  const row = summary as Record<string, number> | null;

  const content: InventoryReportContent = {
    totalItems: Number(row?.total_items ?? 0),
    lowStockCount: Number(row?.low_stock_count ?? 0),
    damagedCount: Number(row?.damaged_count ?? 0),
    issuedCount: Number(row?.issued_count ?? 0),
    issuesCount: Number(row?.issues_count ?? 0),
    ballsIssued: Number(row?.balls_issued ?? 0),
    kitsIssued: Number(row?.kits_issued ?? 0),
    damagesCount: Number(row?.damages_count ?? 0),
    replacementNeeded: Number(row?.replacement_needed ?? 0),
  };

  if (isOpenAiConfigured()) {
    try {
      const typeLabel =
        reportType === "stock_status"
          ? "stan magazynu"
          : reportType === "issued_equipment"
            ? "wydany sprzęt"
            : reportType === "damaged_equipment"
              ? "uszkodzony sprzęt"
              : "historia wydań";
      content.narrative = await generateAiReportContent(
        `Przygotuj krótkie podsumowanie raportu magazynowego (${typeLabel}) klubu ${clubName}. ` +
          `Uwzględnij stany, braki, uszkodzenia i wydania sprzętu.`,
        clubName,
        JSON.stringify(content),
      );
    } catch {
      content.narrative = undefined;
    }
  }

  return content;
}

export function buildInventoryAlerts(stats: {
  lowStockCount: number;
  outOfStockCount: number;
  ballsAvailable: number;
  openDamagesCount: number;
  openOrdersCount: number;
  damagedQuantity: number;
}) {
  const alerts = [];

  if (stats.lowStockCount > 0) {
    alerts.push({
      id: "low-stock",
      type: "low_stock" as const,
      severity: "warning" as const,
      title: "Niski stan magazynowy",
      message: `${stats.lowStockCount} pozycji poniżej minimum`,
      href: "/inventory/items",
    });
  }
  if (stats.outOfStockCount > 0) {
    alerts.push({
      id: "out-of-stock",
      type: "out_of_stock" as const,
      severity: "destructive" as const,
      title: "Brak na stanie",
      message: `${stats.outOfStockCount} pozycji całkowicie niedostępnych`,
      href: "/inventory/items",
    });
  }
  if (stats.ballsAvailable < 5) {
    alerts.push({
      id: "no-balls",
      type: "no_balls" as const,
      severity: "warning" as const,
      title: "Mało piłek",
      message: `Dostępne piłki: ${stats.ballsAvailable}`,
      href: "/inventory/items",
    });
  }
  if (stats.damagedQuantity > 0) {
    alerts.push({
      id: "damaged-stock",
      type: "damaged" as const,
      severity: "warning" as const,
      title: "Uszkodzony sprzęt na stanie",
      message: `${stats.damagedQuantity} szt. oznaczone jako uszkodzone`,
      href: "/inventory/damages",
    });
  }
  if (stats.openDamagesCount > 0) {
    alerts.push({
      id: "open-damages",
      type: "open_damage" as const,
      severity: "destructive" as const,
      title: "Otwarte zgłoszenia usterek",
      message: `${stats.openDamagesCount} zgłoszeń wymaga uwagi`,
      href: "/inventory/damages",
    });
  }
  if (stats.openOrdersCount > 0) {
    alerts.push({
      id: "open-orders",
      type: "open_order" as const,
      severity: "warning" as const,
      title: "Otwarte zamówienia",
      message: `${stats.openOrdersCount} zamówień w toku`,
      href: "/inventory/orders",
    });
  }

  return alerts;
}
