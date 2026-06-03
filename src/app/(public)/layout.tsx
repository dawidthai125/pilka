import { Oswald } from "next/font/google";

import { ClubSitePageWrapper } from "@/features/website/components/club-site-page";

const clubDisplay = Oswald({
  subsets: ["latin", "latin-ext"],
  variable: "--font-club-display",
  weight: ["500", "600", "700"],
});

/** ISR — wartość jak PUBLIC_WEBSITE_REVALIDATE_SECONDS (Next wymaga literału) */
export const revalidate = 300;

export default function PublicClubLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={clubDisplay.variable}>
      <ClubSitePageWrapper>{children}</ClubSitePageWrapper>
    </div>
  );
}
