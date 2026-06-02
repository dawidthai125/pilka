import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-12 text-base",
  xl: "size-16 text-lg",
} as const;

export function ClubLogo({
  logoUrl,
  clubName,
  size = "md",
  className,
  onDark = false,
}: {
  logoUrl?: string | null;
  clubName: string;
  size?: keyof typeof sizeClasses;
  className?: string;
  /** Jasne tło monogramu na ciemnym sidebarze / hero logowania */
  onDark?: boolean;
}) {
  const initials = clubName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
    .slice(0, 2) || "PW";

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={clubName}
        className={cn("shrink-0 rounded-full object-cover", sizeClasses[size], className)}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-bold",
        sizeClasses[size],
        onDark
          ? "bg-[var(--club-secondary,var(--pwa-secondary,#F4C430))] text-[var(--club-primary,var(--pwa-primary,#0B3D2E))]"
          : "bg-[var(--club-primary,var(--pwa-primary,#0B3D2E))] text-[var(--club-accent,#FFFFFF)]",
        className,
      )}
      aria-hidden
    >
      {initials}
    </span>
  );
}
