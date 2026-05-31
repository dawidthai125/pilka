import type { Club } from "@/types/rbac";

/** Pola nazw klubu — niezależne od siebie, edytowalne bez zmiany schematu. */
export type ClubNameFields = Pick<Club, "publicName" | "officialName">;

/** Nazwa publiczna: UI, nawigacja, komunikacja z użytkownikami. */
export function getClubBrandingName(club: Pick<ClubNameFields, "publicName">): string {
  return club.publicName;
}

/** Nazwa oficjalna: licencja, protokoły, dokumenty związku. */
export function getClubOfficialName(club: ClubNameFields): string {
  return club.officialName;
}

/** Czy branding i nazwa oficjalna są już zsynchronizowane (np. po zmianie licencji). */
export function clubsShareBranding(club: ClubNameFields): boolean {
  return club.publicName.trim() === club.officialName.trim();
}

/** Podtytuł w UI, gdy nazwy się różnią — null gdy nie trzeba pokazywać. */
export function formatClubOfficialSubtitle(club: ClubNameFields): string | null {
  if (clubsShareBranding(club)) {
    return null;
  }

  return `Nazwa oficjalna: ${club.officialName}`;
}
