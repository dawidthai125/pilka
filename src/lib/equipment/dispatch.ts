import { createAdminClient } from "@/lib/supabase/admin";

type AssetNotifyEvent = "asset_return_overdue" | "asset_damaged" | "asset_maintenance_due";

async function dispatchEquipmentNotification(
  clubId: string,
  userId: string,
  eventType: AssetNotifyEvent,
  title: string,
  body: string,
  href: string,
  payload: Record<string, string>,
): Promise<void> {
  const admin = createAdminClient();

  await admin.from("club_notifications").insert({
    club_id: clubId,
    user_id: userId,
    title,
    body,
    href,
    delivery_channels: ["in_app"],
    scheduled_at: new Date().toISOString(),
  });

  await admin.from("notification_queue").insert({
    club_id: clubId,
    user_id: userId,
    event_type: eventType as "general",
    title,
    body,
    href,
    payload,
    status: "pending",
  });
}

export async function notifyAssetReturnOverdue(
  clubId: string,
  userId: string,
  assignmentId: string,
  assetName: string,
): Promise<void> {
  await dispatchEquipmentNotification(
    clubId,
    userId,
    "asset_return_overdue",
    "Brak zwrotu sprzętu",
    `Termin zwrotu minął: ${assetName}. Zarejestruj zwrot w module Equipment.`,
    "/equipment/assignments",
    { assignmentId },
  );
}

export async function notifyAssetDamaged(
  clubId: string,
  userIds: string[],
  assetName: string,
  maintenanceId: string,
): Promise<void> {
  for (const userId of userIds) {
    await dispatchEquipmentNotification(
      clubId,
      userId,
      "asset_damaged",
      "Sprzęt uszkodzony",
      `Zgłoszono uszkodzenie: ${assetName}.`,
      "/equipment/maintenance",
      { maintenanceId },
    );
  }
}

export async function notifyAssetMaintenanceDue(
  clubId: string,
  userIds: string[],
  assetName: string,
  maintenanceId: string,
  dueDate: string,
): Promise<void> {
  for (const userId of userIds) {
    await dispatchEquipmentNotification(
      clubId,
      userId,
      "asset_maintenance_due",
      "Termin przeglądu sprzętu",
      `Przegląd ${assetName} zaplanowany na ${dueDate}.`,
      "/equipment/maintenance",
      { maintenanceId },
    );
  }
}
