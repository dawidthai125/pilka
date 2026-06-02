import type { Metadata } from "next";

import { PublicDarkCard, PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { WEBSITE_SPONSOR_TIER_LABELS } from "@/lib/website/constants";
import { getPublicSponsors } from "@/lib/website/public-data";
import type { WebsiteSponsorTier } from "@/types/website";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Sponsorzy", "/sponsorzy");
}

const TIERS: WebsiteSponsorTier[] = ["main", "supporting", "partner"];

export default async function SponsorsPublicPage() {
  const sponsors = await getPublicSponsors();

  return (
    <PublicPageShell eyebrow="Partnerzy" title="Partnerzy klubu" subtitle="Firmy wspierające rozwój Pioruna — jak na koszulkach i Facebooku.">
      <div className="space-y-10">
        {TIERS.map((tier) => {
          const tierSponsors = sponsors.filter((s) => s.publicTier === tier);
          if (!tierSponsors.length) return null;
          return (
            <section key={tier}>
              <h2 className="mb-4 text-xl font-semibold text-[var(--club-secondary)]">{WEBSITE_SPONSOR_TIER_LABELS[tier]}</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {tierSponsors.map((s) => (
                  <PublicDarkCard key={s.id}>
                    <h3 className="font-semibold text-white">{s.companyName}</h3>
                    {s.publicDescription ? <p className="mt-2 text-sm text-white/60">{s.publicDescription}</p> : null}
                    {s.website ? (
                      <a
                        href={s.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-block text-sm text-[var(--club-secondary)] underline"
                      >
                        Strona www
                      </a>
                    ) : null}
                  </PublicDarkCard>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </PublicPageShell>
  );
}
