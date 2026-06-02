"use client";

import { useEffect } from "react";

import { getClubThemeCssVariables } from "@/lib/club/theme";
import type { ClubTheme } from "@/lib/club/theme";

export function PwaThemeMeta({ theme }: { theme: ClubTheme }) {
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
    for (const [key, value] of Object.entries(getClubThemeCssVariables(theme))) {
      document.documentElement.style.setProperty(key, value);
    }
  }, [theme]);

  return null;
}
