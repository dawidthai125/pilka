import type { Metadata } from "next";

import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicWebsiteHome } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Kontakt", "/kontakt");
}

export default async function ContactPublicPage() {
  const home = await getPublicWebsiteHome();
  const settings = home?.settings;

  return (
    <PublicPageShell title="Kontakt" subtitle={`Skontaktuj się z ${home?.club.publicName ?? "klubem"}.`}>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-black/5 bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Dane klubu</h2>
          <dl className="mt-4 space-y-3 text-sm">
            {settings?.contactAddress ? (
              <div>
                <dt className="text-muted-foreground">Adres</dt>
                <dd className="font-medium">{settings.contactAddress}</dd>
              </div>
            ) : null}
            {settings?.contactEmail ? (
              <div>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>
                  <a className="font-medium text-[var(--club-primary)] underline" href={`mailto:${settings.contactEmail}`}>
                    {settings.contactEmail}
                  </a>
                </dd>
              </div>
            ) : null}
            {settings?.contactPhone ? (
              <div>
                <dt className="text-muted-foreground">Telefon</dt>
                <dd>
                  <a className="font-medium text-[var(--club-primary)] underline" href={`tel:${settings.contactPhone}`}>
                    {settings.contactPhone}
                  </a>
                </dd>
              </div>
            ) : null}
          </dl>
        </div>

        {settings?.googleMapsEmbedUrl ? (
          <div className="rounded-xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="mb-3 font-semibold">Mapa</h2>
            <a
              href={settings.googleMapsEmbedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--club-primary)] px-4 text-sm font-medium text-[var(--club-accent)]"
            >
              Otwórz w Google Maps
            </a>
          </div>
        ) : null}
      </div>
    </PublicPageShell>
  );
}
