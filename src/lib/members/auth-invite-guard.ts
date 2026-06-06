import type { SupabaseClient } from "@supabase/supabase-js";

/** Per-club cap before 20.5C bulk — protects Supabase Auth email limits. */
export const CLUB_INVITE_MAX_PER_HOUR = 25;

export const INVITE_AUTH_RETRY_ATTEMPTS = 3;
export const INVITE_AUTH_RETRY_BASE_MS = 1000;

export type InviteDelivery = "email" | "login_required";

export class AuthInviteRateLimitError extends Error {
  constructor(limit = CLUB_INVITE_MAX_PER_HOUR) {
    super(
      `Osiągnięto limit ${limit} operacji zaproszeń na godzinę dla tego klubu. ` +
        "Spróbuj ponownie później lub skontaktuj się z administratorem platformy.",
    );
    this.name = "AuthInviteRateLimitError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isAuthRateLimitMessage(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("rate limit") ||
    lower.includes("too many") ||
    lower.includes("over_email") ||
    lower.includes("429") ||
    lower.includes("email rate")
  );
}

/**
 * Counts recent invite-related membership updates as a proxy for Auth invite volume.
 * No new tables — uses club_memberships.updated_at (20.5C bulk will reuse this guard).
 */
export async function assertClubInviteRateLimit(
  admin: SupabaseClient,
  clubId: string,
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { count, error } = await admin
    .from("club_memberships")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .neq("role", "owner")
    .gte("updated_at", oneHourAgo)
    .in("status", ["invited", "archived"]);

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) >= CLUB_INVITE_MAX_PER_HOUR) {
    throw new AuthInviteRateLimitError();
  }
}

type InviteUserByEmailOptions = {
  data?: Record<string, unknown>;
  redirectTo?: string;
};

export async function inviteUserByEmailWithGuard(
  admin: SupabaseClient,
  clubId: string,
  email: string,
  options: InviteUserByEmailOptions,
): Promise<{ userId: string }> {
  await assertClubInviteRateLimit(admin, clubId);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < INVITE_AUTH_RETRY_ATTEMPTS; attempt += 1) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, options);

    if (!error && data.user) {
      return { userId: data.user.id };
    }

    const message = error?.message ?? "unknown";
    lastError = new Error(message);

    if (isAuthRateLimitMessage(message) && attempt < INVITE_AUTH_RETRY_ATTEMPTS - 1) {
      await sleep(INVITE_AUTH_RETRY_BASE_MS * 2 ** attempt);
      continue;
    }

    break;
  }

  const message = lastError?.message ?? "unknown";
  if (isAuthRateLimitMessage(message)) {
    throw new AuthInviteRateLimitError();
  }

  throw new Error(
    `Zaproszenie nie powiodło się: ${message}. ` +
      "Jeśli użytkownik ma już konto, użyj ponownego zaproszenia — wyślemy instrukcję logowania.",
  );
}

export function isAuthUserConfirmed(user: {
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
}): boolean {
  return Boolean(user.email_confirmed_at ?? user.confirmed_at);
}
