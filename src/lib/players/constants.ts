import type {
  CoachNoteType,
  DocumentValidityStatus,
  DominantFoot,
  PlayerDocumentType,
  PlayerHistoryEventType,
  PlayerPosition,
  PlayerStatus,
} from "@/types/players";

export const PLAYER_STATUS_LABELS: Record<PlayerStatus, string> = {
  active: "Aktywny",
  injured: "Kontuzjowany",
  suspended: "Zawieszony",
  inactive: "Nieaktywny",
};

export const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: "Bramkarz",
  defender: "Obrońca",
  midfielder: "Pomocnik",
  forward: "Napastnik",
};

export const DOMINANT_FOOT_LABELS: Record<DominantFoot, string> = {
  left: "Lewa",
  right: "Prawa",
  both: "Obie",
};

export const PLAYER_DOCUMENT_TYPE_LABELS: Record<PlayerDocumentType, string> = {
  medical_exam: "Badania lekarskie",
  parent_consent: "Zgoda rodzica",
  club_declaration: "Deklaracja klubowa",
  insurance: "Ubezpieczenie",
  document_photo: "Zdjęcie dokumentu",
  other: "Inny załącznik",
};

export const DOCUMENT_VALIDITY_LABELS: Record<DocumentValidityStatus, string> = {
  valid: "Ważny",
  expiring_soon: "Wygasa wkrótce",
  expired: "Nieważny",
};

export const PLAYER_HISTORY_EVENT_LABELS: Record<PlayerHistoryEventType, string> = {
  transfer_in: "Transfer do klubu",
  transfer_out: "Transfer z klubu",
  previous_club: "Poprzedni klub",
  position_change: "Zmiana pozycji",
  jersey_number_change: "Zmiana numeru",
};

export const COACH_NOTE_TYPE_LABELS: Record<CoachNoteType, string> = {
  observation: "Obserwacja",
  progress: "Postępy",
  health: "Problemy zdrowotne",
  training_goal: "Cel treningowy",
};

export const CLUB_ASSETS_BUCKET = "club-assets";

export function playerPhotoPath(clubId: string, playerId: string, ext: string) {
  return `${clubId}/players/${playerId}/photo.${ext}`;
}

export function playerDocumentPath(
  clubId: string,
  playerId: string,
  documentId: string,
  fileName: string,
) {
  return `${clubId}/players/${playerId}/documents/${documentId}/${fileName}`;
}
