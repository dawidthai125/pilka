import type { SupabaseClient } from "@supabase/supabase-js";

export async function verifyContentReferences(
  supabase: SupabaseClient,
  clubId: string,
  refs: {
    matchId?: string | null;
    videoId?: string | null;
    sponsorId?: string | null;
    videoClipId?: string | null;
    postId?: string | null;
  },
): Promise<string | null> {
  if (refs.matchId) {
    const { count } = await supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("id", refs.matchId)
      .eq("club_id", clubId);
    if (!count) return "Mecz nie należy do tego klubu.";
  }

  if (refs.videoId) {
    const { count } = await supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("id", refs.videoId)
      .eq("club_id", clubId);
    if (!count) return "Nagranie nie należy do tego klubu.";
  }

  if (refs.sponsorId) {
    const { count } = await supabase
      .from("sponsors")
      .select("id", { count: "exact", head: true })
      .eq("id", refs.sponsorId)
      .eq("club_id", clubId);
    if (!count) return "Sponsor nie należy do tego klubu.";
  }

  if (refs.videoClipId) {
    const { data } = await supabase
      .from("video_clips")
      .select("video_id, videos!inner(club_id)")
      .eq("id", refs.videoClipId)
      .maybeSingle();
    const videoClubId = (data?.videos as { club_id?: string } | null)?.club_id;
    if (videoClubId !== clubId) return "Klip wideo nie należy do tego klubu.";
  }

  if (refs.postId) {
    const { count } = await supabase
      .from("content_posts")
      .select("id", { count: "exact", head: true })
      .eq("id", refs.postId)
      .eq("club_id", clubId);
    if (!count) return "Materiał nie należy do tego klubu.";
  }

  return null;
}
