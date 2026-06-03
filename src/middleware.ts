import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getClientEnv } from "@/config/env";
import {
  clubPublicPath,
  extractRouteClubSlug,
  isLegacyFlatPublicPath,
  isPublicWebsitePath,
  resolveClubSlugFromHost,
} from "@/lib/tenant/public-club";
import type { Database } from "@/types/database";

const authRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
const protectedPrefixes = [
  "/dashboard",
  "/profile",
  "/settings",
  "/club",
  "/teams",
  "/players",
  "/training",
  "/matches",
  "/ai",
  "/sponsors",
  "/finance",
  "/inventory",
  "/website",
  "/integrations",
  "/notifications",
  "/members",
  "/academy",
  "/video",
  "/content",
  "/league",
  "/communication",
  "/attendance",
  "/crm",
  "/equipment",
  "/injuries",
  "/platform",
];

function isAuthRoute(pathname: string) {
  return authRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function isProtectedRoute(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function isSelfAuthenticatingApiRoute(pathname: string) {
  return pathname === "/api/pwa/offline-data";
}

async function fetchActiveClubCount(request: NextRequest): Promise<number> {
  const env = getClientEnv();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );

  const { count } = await supabase
    .from("clubs")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  return count ?? 0;
}

async function fetchLegacyRedirectClubSlug(
  request: NextRequest,
): Promise<string | null> {
  const env = getClientEnv();
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    },
  );

  const { data } = await supabase
    .from("clubs")
    .select("slug")
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  return data?.slug ? String(data.slug) : null;
}

function buildLegacyRedirectUrl(request: NextRequest, clubSlug: string): URL {
  const { pathname } = request.nextUrl;
  const targetPath =
    pathname === "/" ? clubPublicPath(clubSlug) : clubPublicPath(clubSlug, pathname);
  const url = request.nextUrl.clone();
  url.pathname = targetPath;
  return url;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") ?? "";

  if (isSelfAuthenticatingApiRoute(pathname)) {
    return NextResponse.next();
  }

  const hostSlug = resolveClubSlugFromHost(host);
  if (hostSlug && !extractRouteClubSlug(pathname)) {
    const url = buildLegacyRedirectUrl(request, hostSlug);
    return NextResponse.redirect(url, 301);
  }

  if (isLegacyFlatPublicPath(pathname) && !extractRouteClubSlug(pathname)) {
    if (pathname === "/") {
      const activeCount = await fetchActiveClubCount(request);
      if (activeCount !== 1) {
        return NextResponse.next();
      }
    }

    const legacySlug = await fetchLegacyRedirectClubSlug(request);
    if (legacySlug) {
      return NextResponse.redirect(buildLegacyRedirectUrl(request, legacySlug), 301);
    }
  }

  if (isPublicWebsitePath(pathname)) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });
  const env = getClientEnv();

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }

          supabaseResponse = NextResponse.next({ request });

          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isAuthRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
