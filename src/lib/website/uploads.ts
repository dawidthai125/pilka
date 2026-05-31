import { CLUB_ASSET_PHOTO_MIME_TYPES, validateClubAssetFile } from "@/lib/players/uploads";

export function buildWebsiteLogoPath(clubId: string, fileName: string, variant: "light" | "dark" = "light"): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "png";
  return `${clubId}/website/branding/logo-${variant}.${ext}`;
}

export function buildWebsiteHeroPath(clubId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `${clubId}/website/branding/hero.${ext}`;
}

export function buildWebsiteNewsImagePath(clubId: string, newsId: string, fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `${clubId}/website/news/${newsId}/featured.${ext}`;
}

export function buildWebsiteGalleryPhotoPath(
  clubId: string,
  albumId: string,
  photoId: string,
  fileName: string,
): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "jpg";
  return `${clubId}/website/gallery/${albumId}/${photoId}.${ext}`;
}

export function validateWebsiteImage(file: File): string | null {
  return validateClubAssetFile(file, CLUB_ASSET_PHOTO_MIME_TYPES);
}
