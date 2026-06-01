import { NextResponse } from "next/server";

import { markNotificationRead } from "@/features/training/actions";
import { setTrainingAvailability } from "@/features/training/actions";
import { requireAccessContext } from "@/lib/auth/session";

type SyncBody = {
  type: string;
  payload: Record<string, unknown>;
};

export async function POST(request: Request) {
  try {
    await requireAccessContext();
    const body = (await request.json()) as SyncBody;

    switch (body.type) {
      case "notification_read": {
        const id = String(body.payload.notificationId ?? "");
        if (!id) return NextResponse.json({ error: "Missing notificationId" }, { status: 400 });
        await markNotificationRead(id);
        return NextResponse.json({ ok: true });
      }
      case "training_availability": {
        const trainingId = String(body.payload.trainingId ?? "");
        const formData = new FormData();
        formData.set("status", String(body.payload.status ?? ""));
        if (body.payload.absenceReason) {
          formData.set("absenceReason", String(body.payload.absenceReason));
        }
        if (body.payload.notes) {
          formData.set("notes", String(body.payload.notes));
        }
        const result = await setTrainingAvailability(trainingId, {}, formData);
        if (result.error) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }
        return NextResponse.json({ ok: true });
      }
      default:
        return NextResponse.json({ error: "Unsupported sync type" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
