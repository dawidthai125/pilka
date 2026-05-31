const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function buildInventoryPhotoPath(
  clubId: string,
  itemId: string,
  fileName: string,
): string {
  const ext = fileName.includes(".") ? fileName.split(".").pop() : "jpg";
  return `${clubId}/inventory/items/${itemId}.${ext}`;
}

export function validateInventoryPhoto(file: File): string | null {
  if (file.size > MAX_FILE_SIZE) return "Plik jest za duży (max 5 MB).";
  if (!ALLOWED_TYPES.includes(file.type)) return "Dozwolone formaty: JPG, PNG, WEBP.";
  return null;
}
