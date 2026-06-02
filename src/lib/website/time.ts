/** Formatuje datę publikacji jak na Facebooku (pl). */
export function formatRelativeTimePl(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return "dzisiaj";
  if (diffDays === 1) return "1 dzień temu";
  if (diffDays < 7) return `${diffDays} dni temu`;
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return weeks === 1 ? "1 tydzień temu" : `${weeks} tygodni temu`;
  }
  return date.toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" });
}

/** Np. 08.06.2025 (niedz.) 17:00 */
export function formatPublicMatchKickoffLong(match: { matchDate: string; matchTime?: string | null }): string | null {
  const normalized = match.matchDate?.trim();
  if (!normalized) return null;
  const parsed = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const datePart = parsed.toLocaleDateString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const weekday = parsed.toLocaleDateString("pl-PL", { weekday: "short" }).replace(".", "");
  const time = match.matchTime?.slice(0, 5);
  if (time && time !== "00:00") {
    return `${datePart} (${weekday}.) ${time}`;
  }
  return `${datePart} (${weekday}.)`;
}
