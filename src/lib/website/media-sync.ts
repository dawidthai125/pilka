import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

type ServerClient = SupabaseClient<Database>;

/** Sync legacy branding hero upload into website_media (hero slot: team). */
export async function syncWebsiteHeroMediaSlot(
  supabase: ServerClient,
  clubId: string,
  storagePath: string,
): Promise<{ error: string | null }> {
  const { data: existing, error: fetchError } = await supabase
    .from("website_media")
    .select("id")
    .eq("club_id", clubId)
    .eq("section", "hero")
    .eq("slot_key", "team")
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };

  const { error } = await supabase.from("website_media").upsert({
    id: existing?.id ?? crypto.randomUUID(),
    club_id: clubId,
    section: "hero",
    slot_key: "team",
    storage_path: storagePath,
    sort_order: 1,
    caption: "Zdjęcie hero",
    is_active: true,
  });

  return { error: error?.message ?? null };
}
