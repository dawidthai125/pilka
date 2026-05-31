import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/config/env";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/aktualnosci", "/mecze", "/druzyna", "/tabela", "/sponsorzy", "/galeria", "/kontakt", "/kibic"],
      disallow: ["/dashboard", "/website", "/finance", "/inventory", "/players", "/matches", "/ai", "/login"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
