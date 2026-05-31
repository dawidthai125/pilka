import type { Metadata } from "next";

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
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold">Sponsorzy i partnerzy</h1>
        <p className="mt-2 text-muted-foreground">Firmy wspierające rozwój klubu.</p>
      </div>

      {TIERS.map((tier) => {
        const tierSponsors = sponsors.filter((s) => s.publicTier === tier);
        if (!tierSponsors.length) return null;
        return (
          <section key={tier}>
            <h2 className="mb-4 text-xl font-semibold">{WEBSITE_SPONSOR_TIER_LABELS[tier]}</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tierSponsors.map((s) => (
                <div key={s.id} className="rounded-xl border bg-card p-6">
                  <h3 className="font-semibold">{s.companyName}</h3>
                  {s.publicDescription ? <p className="mt-2 text-sm text-muted-foreground">{s.publicDescription}</p> : null}
                  {s.website ? (
                    <a href={s.website} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-primary underline">
                      Strona www
                    </a>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
