import { NextResponse } from "next/server";

import { dispatchPendingPushNotifications } from "@/lib/pwa/push-dispatch";

function isAuthorized(request: Request): boolean {
  const secret = process.env.PWA_CRON_SECRET;
  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

/** Cron/worker endpoint — processes notification_queue via Web Push. */
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await dispatchPendingPushNotifications();
  return NextResponse.json({ ok: true, ...result });
}
