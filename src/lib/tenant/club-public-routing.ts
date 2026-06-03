/** Client-safe public club routing helpers — no server imports. */

/** Public subpages (first path segment after club slug). */
export const PUBLIC_PAGE_SEGMENTS = [
  "druzyna",
  "tabela",
  "mecze",
  "aktualnosci",
  "galeria",
  "kontakt",
  "sponsorzy",
  "kibic",
] as const;

export type PublicPageSegment = (typeof PUBLIC_PAGE_SEGMENTS)[number];

const APP_ROOT_SEGMENTS = new Set([
  "login",
  "register",
  "forgot-password",
  "reset-password",
  "dashboard",
  "profile",
  "settings",
  "club",
  "teams",
  "players",
  "training",
  "matches",
  "ai",
  "sponsors",
  "finance",
  "inventory",
  "website",
  "integrations",
  "notifications",
  "members",
  "academy",
  "video",
  "content",
  "league",
  "communication",
  "attendance",
  "crm",
  "equipment",
  "injuries",
  "api",
  "clubs",
  "platform",
  "_next",
]);

export function isPublicPageSegment(segment: string): segment is PublicPageSegment {
  return (PUBLIC_PAGE_SEGMENTS as readonly string[]).includes(segment);
}

export function isAppRootSegment(segment: string): boolean {
  return APP_ROOT_SEGMENTS.has(segment);
}

export function clubPublicPath(clubSlug: string, path = "/"): string {
  if (!path || path === "/") return `/${clubSlug}`;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${clubSlug}${normalized}`;
}

export function extractRouteClubSlug(pathname: string): string | null {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (!segment || isAppRootSegment(segment) || isPublicPageSegment(segment)) return null;
  return segment;
}

/** Pre–18.1 flat URLs: `/druzyna`, `/aktualnosci/foo` (no club slug prefix). */
export function isLegacyFlatPublicPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return PUBLIC_PAGE_SEGMENTS.some(
    (seg) => pathname === `/${seg}` || pathname.startsWith(`/${seg}/`),
  );
}

/**
 * Subdomain routing (variant B): `{slug}.platform.host` → club slug.
 * Requires platform-level `NEXT_PUBLIC_PLATFORM_HOST` (not club-specific).
 */
export function resolveClubSlugFromHost(host: string): string | null {
  const platformHost = process.env.NEXT_PUBLIC_PLATFORM_HOST?.trim().toLowerCase();
  if (!platformHost) return null;

  const hostname = host.split(":")[0]!.toLowerCase();
  if (hostname === platformHost || hostname === `www.${platformHost}`) return null;

  const suffix = `.${platformHost}`;
  if (!hostname.endsWith(suffix)) return null;

  const subdomain = hostname.slice(0, -suffix.length);
  if (!subdomain || subdomain === "www") return null;
  return subdomain;
}

export function isPublicWebsitePath(pathname: string): boolean {
  if (pathname === "/" || pathname === "/clubs") return true;
  const routeSlug = extractRouteClubSlug(pathname);
  if (routeSlug) return true;
  return isLegacyFlatPublicPath(pathname);
}
