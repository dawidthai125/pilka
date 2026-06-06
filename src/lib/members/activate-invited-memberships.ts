import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Promotes all invited club memberships to active after the user authenticates.
 * Uses service role because RLS only allows leadership to UPDATE memberships.
 */
export async function activateInvitedMemberships(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("club_memberships")
    .update({ status: "active" })
    .eq("user_id", userId)
    .eq("status", "invited")
    .select("id");

  if (error) {
    throw new Error(error.message);
  }

  return data?.length ?? 0;
}
