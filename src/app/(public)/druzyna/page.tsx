import type { Metadata } from "next";

import { PublicDarkSquadList } from "@/features/website/components/public-dark-subpage-content";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicPlayers } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Kadra", "/druzyna");
}

export default async function TeamPublicPage() {
  const players = await getPublicPlayers();

  return (
    <PublicPageShell
      eyebrow="Skład"
      title="Kadra drużyny"
      subtitle="Zawodnicy, pozycje, numery i statystyki sezonu."
    >
      <PublicDarkSquadList players={players} />
    </PublicPageShell>
  );
}
