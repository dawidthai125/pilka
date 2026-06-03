import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Platform-level operator role — separate from club_memberships roles.
 * Configured via PLATFORM_ADMIN_EMAILS (comma-separated), not per-club ENV.
 */
export function getPlatformAdminEmails(): string[] {
  const raw = process.env.PLATFORM_ADMIN_EMAILS?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isPlatformAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const admins = getPlatformAdminEmails();
  if (admins.length === 0) return false;
  return admins.includes(email.trim().toLowerCase());
}

export async function getPlatformAdminSession() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  if (!isPlatformAdminEmail(user.email)) return null;
  return user;
}

export async function requirePlatformAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/platform/clubs");
  if (!isPlatformAdminEmail(user.email)) redirect("/dashboard");

  return user;
}
