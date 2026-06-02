"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
} as const;

type ClubLogoProps = {
  logoUrl?: string | null;
  clubName: string;
  size?: keyof typeof sizeClasses;
  className?: string;
  /** Jasne tło monogramu na ciemnym sidebarze / hero logowania */
  onDark?: boolean;
  /** Okładka FB — białe tło pod okrągłym herbem */
  variant?: "default" | "profile" | "crest";
};

export function ClubLogo({
  logoUrl,
  clubName,
  size = "md",
  className,
  onDark = false,
  variant = "default",
}: ClubLogoProps) {
  const [imgError, setImgError] = useState(false);

  const initials =
    clubName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("")
      .slice(0, 2) || "PW";

  const showImage = Boolean(logoUrl) && !imgError;
  const isCrest = variant === "crest" || variant === "profile" || variant === "default";

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl!}
        alt={clubName}
        onError={() => setImgError(true)}
        className={cn(
          "shrink-0 object-contain",
          isCrest ? "rounded-full bg-white p-0.5" : "rounded-lg",
          sizeClasses[size],
          className,
        )}
      />
    );
  }

  const monogramClass =
    variant === "profile"
      ? "bg-[var(--club-secondary,#F4C430)] text-[var(--club-primary,#0B3D2E)]"
      : onDark
        ? "bg-[var(--club-secondary,var(--pwa-secondary,#F4C430))] text-[var(--club-primary,var(--pwa-primary,#0B3D2E))]"
        : "bg-[var(--club-primary,var(--pwa-primary,#0B3D2E))] text-[var(--club-accent,#FFFFFF)]";

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        sizeClasses[size],
        monogramClass,
        className,
      )}
      aria-label={clubName}
      role="img"
    >
      {initials}
    </span>
  );
}
