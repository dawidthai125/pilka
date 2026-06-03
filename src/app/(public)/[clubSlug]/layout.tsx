import { notFound } from "next/navigation";

import { ClubSitePageWrapper } from "@/features/website/components/club-site-page";
import { PublicClubProvider } from "@/features/website/public-club-context";
import { resolvePublicClubBySlug } from "@/lib/tenant/public-club";

type Props = {
  children: React.ReactNode;
  params: Promise<{ clubSlug: string }>;
};

export default async function ClubPublicLayout({ children, params }: Props) {
  const { clubSlug } = await params;
  const club = await resolvePublicClubBySlug(clubSlug);
  if (!club) notFound();

  return (
    <PublicClubProvider clubSlug={club.slug}>
      <ClubSitePageWrapper clubSlug={club.slug}>{children}</ClubSitePageWrapper>
    </PublicClubProvider>
  );
}
