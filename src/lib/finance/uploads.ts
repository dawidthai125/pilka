import {
  CLUB_ASSET_DOCUMENT_MIME_TYPES,
  CLUB_ASSET_MAX_BYTES,
  sanitizeStorageFileName,
  validateClubAssetFile,
} from "@/lib/players/uploads";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isClubFinanceAssetPath(path: string, clubId: string): boolean {
  if (path.includes("..")) return false;
  const segments = path.split("/");
  if (segments.length < 4) return false;
  if (segments[0] !== clubId) return false;
  if (segments[1] !== "finance") return false;
  return true;
}

export function buildFinanceDocumentPath(
  clubId: string,
  folder: string,
  documentId: string,
  fileName: string,
): string {
  const safeFolder = folder.replace(/[^a-z]/gi, "") || "documents";
  const safeName = sanitizeStorageFileName(fileName);
  return `${clubId}/finance/${safeFolder}/${documentId}/${safeName}`;
}

export function validateFinanceAttachment(file: File): string | null {
  return validateClubAssetFile(file, CLUB_ASSET_DOCUMENT_MIME_TYPES);
}

export { CLUB_ASSET_MAX_BYTES, CLUB_ASSET_DOCUMENT_MIME_TYPES, sanitizeStorageFileName };

export function isValidFinanceFolder(folder: string): boolean {
  return ["invoices", "receipts", "contracts", "expenses"].includes(folder);
}

export function parseFinanceDocumentIdFromPath(path: string): string | null {
  const segments = path.split("/");
  if (segments.length < 5) return null;
  const id = segments[3] ?? "";
  return UUID_PATTERN.test(id) ? id : null;
}
