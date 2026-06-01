import { NextResponse } from "next/server";

import { requireAccessContext } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const access = await requireAccessContext();
    const body = (await request.json()) as {
      endpoint: string;
      p256dh: string;
      auth: string;
      userAgent?: string;
    };

    if (!body.endpoint || !body.p256dh || !body.auth) {
      return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        club_id: access.clubId,
        user_id: access.userId,
        endpoint: body.endpoint,
        p256dh: body.p256dh,
        auth: body.auth,
        user_agent: body.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
