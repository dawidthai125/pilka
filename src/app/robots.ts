import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/config/env";
import { PUBLIC_PAGE_SEGMENTS } from "@/lib/tenant/public-club";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  const allowPatterns = [
    "/",
    ...PUBLIC_PAGE_SEGMENTS.flatMap((seg) => [`/*/${seg}`, `/${seg}`]),
  ];

  return {
    rules: {
      userAgent: "*",
      allow: allowPatterns,
      disallow: ["/dashboard", "/website", "/finance", "/inventory", "/players", "/matches", "/ai", "/login"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
