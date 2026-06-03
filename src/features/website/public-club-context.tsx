"use client";

import { createContext, useContext, useMemo } from "react";

import { buildPublicClubPaths, type PublicClubPaths } from "@/lib/website/public-paths";

type PublicClubContextValue = {
  clubSlug: string;
  paths: PublicClubPaths;
};

const PublicClubContext = createContext<PublicClubContextValue | null>(null);

export function PublicClubProvider({
  clubSlug,
  children,
}: {
  clubSlug: string;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ clubSlug, paths: buildPublicClubPaths(clubSlug) }),
    [clubSlug],
  );
  return <PublicClubContext.Provider value={value}>{children}</PublicClubContext.Provider>;
}

export function usePublicClub(): PublicClubContextValue {
  const ctx = useContext(PublicClubContext);
  if (!ctx) {
    throw new Error("usePublicClub must be used within PublicClubProvider");
  }
  return ctx;
}
