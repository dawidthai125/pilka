import { ContentChannelQueue } from "@/features/content/components/content-calendar-view";
import { getDashboardContext, requireContentReadAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { mapContentChannelVariant } from "@/lib/content/mappers";

export default async function ContentChannelsPage() {
  const { access } = await getDashboardContext();
  requireContentReadAccess(access);

  const supabase = await createClient();
  const { data } = await supabase
    .from("content_channel_variants")
    .select("*")
    .eq("club_id", access.clubId)
    .in("channel", ["facebook", "instagram", "sponsor", "club_announcement"])
    .order("queue_position");

  const variants = (data ?? []).map((row) => mapContentChannelVariant(row as Record<string, unknown>));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kanały i kolejka</h1>
        <p className="text-sm text-muted-foreground">
          Facebook, Instagram, sponsorzy — draft i kolejka. Automatyczna publikacja w ETAP 15B+.
        </p>
      </div>
      <ContentChannelQueue variants={variants} />
    </div>
  );
}
