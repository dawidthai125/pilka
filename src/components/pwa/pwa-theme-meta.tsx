"use client";

import { useEffect } from "react";

import type { PwaThemeColors } from "@/lib/pwa/branding";

export function PwaThemeMeta({ theme }: { theme: PwaThemeColors }) {
  useEffect(() => {
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) {
      themeMeta.setAttribute("content", theme.themeColor);
    } else {
      const meta = document.createElement("meta");
      meta.name = "theme-color";
      meta.content = theme.themeColor;
      document.head.appendChild(meta);
    }
    document.documentElement.style.setProperty("--pwa-primary", theme.primaryColor);
    document.documentElement.style.setProperty("--pwa-secondary", theme.secondaryColor);
  }, [theme]);

  return null;
}
