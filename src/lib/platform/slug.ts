const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RESERVED_SLUGS = new Set([
  "login",
  "register",
  "dashboard",
  "platform",
  "api",
  "clubs",
  "website",
  "settings",
  "profile",
]);

export function slugifyClubInput(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function deriveShortName(publicName: string): string {
  const words = publicName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "CLB";
  if (words.length === 1) return words[0]!.slice(0, 3).toUpperCase();
  return words
    .slice(0, 3)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function validateClubSlug(slug: string): string | null {
  const normalized = slugifyClubInput(slug);
  if (normalized.length < 3) return "Slug musi mieć co najmniej 3 znaki.";
  if (normalized.length > 48) return "Slug może mieć maksymalnie 48 znaków.";
  if (!SLUG_PATTERN.test(normalized)) return "Slug: tylko małe litery, cyfry i myślniki.";
  if (RESERVED_SLUGS.has(normalized)) return "Ten slug jest zarezerwowany.";
  return null;
}

export function validateOwnerEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return "Podaj poprawny adres e-mail właściciela.";
  return null;
}

export function validateHexColor(color: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(color.trim());
}

export function defaultSeasonLabel(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  if (month >= 7) return `${year}/${year + 1}`;
  return `${year - 1}/${year}`;
}
