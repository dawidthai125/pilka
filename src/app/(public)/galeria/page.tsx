import type { Metadata } from "next";
import Link from "next/link";

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
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Galeria zdjęć</h1>
      <p className="mt-2 text-muted-foreground">Mecze, treningi, wydarzenia klubowe.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {albums.map((album) => (
          <Link
            key={album.id}
            href={`/galeria/${album.slug}`}
            className="rounded-xl border bg-card p-6 transition hover:shadow-md"
          >
            <p className="text-xs font-medium text-[var(--club-primary)]">
              {WEBSITE_GALLERY_CATEGORY_LABELS[album.category]}
            </p>
            <h2 className="mt-2 text-lg font-semibold">{album.title}</h2>
            {album.description ? <p className="mt-2 text-sm text-muted-foreground">{album.description}</p> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
