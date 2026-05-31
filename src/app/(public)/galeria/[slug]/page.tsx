import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getWebsiteAssetUrls } from "@/lib/website/assets";
import { getPublicClubId, getPublicGalleryAlbumBySlug, getPublicGalleryPhotos } from "@/lib/website/public-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clubId = await getPublicClubId();
  const album = await getPublicGalleryAlbumBySlug(slug, clubId);
  return buildPublicPageMetadata(album?.title ?? "Galeria", `/galeria/${slug}`);
}

export default async function GalleryAlbumPage({ params }: Props) {
  const { slug } = await params;
  const clubId = await getPublicClubId();
  const album = await getPublicGalleryAlbumBySlug(slug, clubId);
  if (!album) notFound();

  const photos = await getPublicGalleryPhotos(album.id, clubId);
  const urls = await getWebsiteAssetUrls(photos.map((p) => p.imagePath));

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">{album.title}</h1>
      {album.description ? <p className="mt-2 text-muted-foreground">{album.description}</p> : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {photos.map((photo) => {
          const url = urls.get(photo.imagePath);
          return (
            <figure key={photo.id} className="overflow-hidden rounded-xl border bg-card">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt={photo.caption ?? album.title}
                  loading="lazy"
                  decoding="async"
                  width={800}
                  height={600}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] items-center justify-center bg-muted text-sm text-muted-foreground">
                  Zdjęcie niedostępne
                </div>
              )}
              {photo.caption ? <figcaption className="p-3 text-sm">{photo.caption}</figcaption> : null}
            </figure>
          );
        })}
      </div>
    </div>
  );
}
