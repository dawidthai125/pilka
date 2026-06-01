export const VIDEO_STORAGE_BUCKET = "club-videos";

export const VIDEO_ALLOWED_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska",
] as const;

export const VIDEO_ALLOWED_EXTENSIONS = [".mp4", ".mov", ".avi", ".mkv"] as const;

/** Domyślny limit — nadpisywalny przez VIDEO_MAX_UPLOAD_MB w env. */
export const DEFAULT_VIDEO_MAX_UPLOAD_MB = Number(process.env.VIDEO_MAX_UPLOAD_MB ?? 500);

export function getVideoMaxUploadBytes(): number {
  return DEFAULT_VIDEO_MAX_UPLOAD_MB * 1024 * 1024;
}

export function buildVideoStoragePath(clubId: string, videoId: string, fileName: string): string {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${clubId}/videos/${videoId}/${safeName}`;
}

export function parseVideoStoragePath(
  storagePath: string,
): { clubId: string; videoId: string } | null {
  const match = storagePath.match(
    /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/videos\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i,
  );
  if (!match?.[1] || !match[2]) return null;
  return { clubId: match[1], videoId: match[2] };
}

export function isStoragePathForVideo(
  storagePath: string,
  clubId: string,
  videoId: string,
): boolean {
  const parsed = parseVideoStoragePath(storagePath);
  return parsed?.clubId === clubId && parsed?.videoId === videoId;
}

export function validateVideoUpload(file: { type: string; size: number; name: string }): string | null {
  if (!VIDEO_ALLOWED_MIME_TYPES.includes(file.type as (typeof VIDEO_ALLOWED_MIME_TYPES)[number])) {
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    if (!VIDEO_ALLOWED_EXTENSIONS.includes(ext as (typeof VIDEO_ALLOWED_EXTENSIONS)[number])) {
      return "Dozwolone formaty: MP4, MOV, AVI, MKV.";
    }
  }
  if (file.size > getVideoMaxUploadBytes()) {
    return `Maksymalny rozmiar pliku: ${DEFAULT_VIDEO_MAX_UPLOAD_MB} MB.`;
  }
  if (file.size <= 0) {
    return "Plik jest pusty.";
  }
  return null;
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
