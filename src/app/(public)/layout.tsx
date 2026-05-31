import { ClubSitePageWrapper } from "@/features/website/components/club-site-page";

/** ISR — wartość jak PUBLIC_WEBSITE_REVALIDATE_SECONDS (Next wymaga literału) */
export const revalidate = 60;

export default function PublicClubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ClubSitePageWrapper>{children}</ClubSitePageWrapper>;
}
