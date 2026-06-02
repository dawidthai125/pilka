import type { Metadata } from "next";
import Link from "next/link";

import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { WEBSITE_GALLERY_CATEGORY_LABELS } from "@/lib/website/constants";
import { getPublicClubId, getPublicGalleryAlbums } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Galeria", "/galeria");
}

export default async function GalleryPublicPage() {
  const clubId = await getPublicClubId();
  const albums = await getPublicGalleryAlbums(clubId);

  return (
    <PublicPageShell eyebrow="Media" title="Zdjęcia" subtitle="Albumy ze strony klubu i Facebooka.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/galeria/${album.slug}`}
            className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur-sm transition hover:border-white/20 hover:bg-black/35"
          >
            <p className="text-xs font-medium text-[var(--club-secondary)]">
              {WEBSITE_GALLERY_CATEGORY_LABELS[album.category]}
            </p>
            <h2 className="mt-2 text-lg font-semibold text-white">{album.title}</h2>
            {album.description ? <p className="mt-2 text-sm text-white/60">{album.description}</p> : null}
          </Link>
        ))}
      </div>
    </PublicPageShell>
  );
}
