import type { MetadataRoute } from "next";

import { PWA_DEFAULT_THEME } from "@/lib/pwa/branding";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: PWA_DEFAULT_THEME.name,
    short_name: PWA_DEFAULT_THEME.shortName,
    description: "System operacyjny klubu piłkarskiego — mecze, treningi, finanse i AI.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: PWA_DEFAULT_THEME.backgroundColor,
    theme_color: PWA_DEFAULT_THEME.themeColor,
    lang: "pl",
    dir: "ltr",
    categories: ["sports", "productivity"],
    icons: [
      {
        src: "/icons/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Mecze",
        url: "/matches",
        description: "Terminarz i wyniki",
      },
      {
        name: "Treningi",
        url: "/training",
        description: "Plan treningów",
      },
      {
        name: "AI Assistant",
        url: "/ai/chat",
        description: "Club AI Assistant",
      },
    ],
  };
}
