export const CLUB_ASSET_MAX_BYTES = 10 * 1024 * 1024;

export const CLUB_ASSET_PHOTO_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export const CLUB_ASSET_DOCUMENT_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeStorageFileName(fileName: string): string {
  const baseName = fileName.split(/[/\\]/).pop() ?? "file";
  const sanitized = baseName.replace(/[^\w.\-() +]/g, "_").trim();
  return (sanitized || "file").slice(0, 120);
}

export function isClubPlayerAssetPath(path: string, clubId: string): boolean {
  if (path.includes("..")) return false;

  const segments = path.split("/");
  if (segments.length < 4) return false;
  if (segments[0] !== clubId) return false;
  if (segments[1] !== "players") return false;
  if (!UUID_PATTERN.test(segments[2] ?? "")) return false;

  return true;
}

export function validateClubAssetFile(
  file: File,
  allowedMimeTypes: Set<string>,
): string | null {
  if (file.size === 0) {
    return "Plik jest pusty.";
  }

  if (file.size > CLUB_ASSET_MAX_BYTES) {
    return "Plik przekracza limit 10 MB.";
  }

  if (!allowedMimeTypes.has(file.type)) {
    return "Niedozwolony typ pliku.";
  }

  return null;
}

export function photoExtensionForMime(mimeType: string): "jpg" | "png" | "webp" | null {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/jpeg") return "jpg";
  return null;
}
