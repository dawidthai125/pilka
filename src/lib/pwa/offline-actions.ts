"use client";

import { markNotificationRead } from "@/features/training/actions";
import { enqueueSyncItem } from "@/lib/pwa/offline-store";

export async function markNotificationReadOfflineAware(notificationId: string): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueSyncItem("notification_read", { notificationId });
    return;
  }
  await markNotificationRead(notificationId);
}

export async function setTrainingAvailabilityOfflineAware(
  trainingId: string,
  payload: {
    status: string;
    absenceReason?: string;
    notes?: string;
  },
): Promise<{ queued: boolean; error?: string }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    await enqueueSyncItem("training_availability", { trainingId, ...payload });
    return { queued: true };
  }

  const formData = new FormData();
  formData.set("status", payload.status);
  if (payload.absenceReason) formData.set("absenceReason", payload.absenceReason);
  if (payload.notes) formData.set("notes", payload.notes);

  const { setTrainingAvailability } = await import("@/features/training/actions");
  const result = await setTrainingAvailability(trainingId, {}, formData);
  if (result.error) return { queued: false, error: result.error };
  return { queued: false };
}
