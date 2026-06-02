/**
 * Builds locality line for public club pages from CMS / club profile (multi-club safe).
 */
export function buildClubLocalityLine(options: {
  contactAddress?: string | null;
  competitionLevel?: string | null;
  voivodeship?: string | null;
}): string | null {
  const parts: string[] = [];

  if (options.contactAddress) {
    const segments = options.contactAddress.split(",").map((part) => part.trim()).filter(Boolean);
    const place = segments.length > 1 ? segments[segments.length - 1] : segments[0];
    if (place) parts.push(place);
  }

  if (options.competitionLevel) {
    parts.push(options.competitionLevel);
  } else if (options.voivodeship) {
    parts.push(options.voivodeship);
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}

export function buildClubCommunityLine(options: {
  playersCount?: number;
  teamsCount?: number;
}): string | null {
  const parts: string[] = [];
  if (options.playersCount && options.playersCount > 0) {
    parts.push(`${options.playersCount} zawodników`);
  }
  if (options.teamsCount && options.teamsCount > 1) {
    parts.push(`${options.teamsCount} drużyn`);
  }
  if (parts.length > 0) {
    parts.push("jedna społeczność");
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
