import type { Metadata } from "next";

import { PublicDarkCard, PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicWebsiteHome } from "@/lib/website/public-data";

type Props = { params: Promise<{ clubSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clubSlug } = await params;
  return buildPublicPageMetadata("Kontakt", clubSlug, "/kontakt");
}

export default async function ContactPublicPage({ params }: Props) {
  const { clubSlug } = await params;
  const home = await getPublicWebsiteHome(clubSlug);
  const settings = home?.settings;

  return (
    <PublicPageShell clubSlug={clubSlug} eyebrow="Kontakt" title="Kontakt" subtitle={`Skontaktuj się z ${home?.club.publicName ?? "klubem"}.`}>
      <div className="grid gap-6 lg:grid-cols-2">
        <PublicDarkCard>
          <h2 className="font-semibold text-white">Dane klubu</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {settings?.contactAddress ? (
              <div>
                <dt className="text-white/45">Adres</dt>
                <dd className="font-medium text-white">{settings.contactAddress}</dd>
              </div>
            ) : null}
            {settings?.contactEmail ? (
              <div>
                <dt className="text-white/45">E-mail</dt>
                <dd>
                  <a className="font-medium text-[var(--club-secondary)] underline" href={`mailto:${settings.contactEmail}`}>
                    {settings.contactEmail}
                  </a>
                </dd>
              </div>
            ) : null}
            {settings?.contactPhone ? (
              <div>
                <dt className="text-white/45">Telefon</dt>
                <dd>
                  <a className="font-medium text-[var(--club-secondary)] underline" href={`tel:${settings.contactPhone}`}>
                    {settings.contactPhone}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </PublicDarkCard>

        {settings?.googleMapsEmbedUrl ? (
          <PublicDarkCard>
            <h2 className="mb-3 font-semibold text-white">Mapa</h2>
            <a
              href={settings.googleMapsEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-lg bg-[var(--club-secondary)] px-4 text-sm font-bold text-[var(--club-primary)]"
            >
              Otwórz w Google Maps
            </a>
          </PublicDarkCard>
        ) : null}
      </div>
    </PublicPageShell>
  );
}
