export const PLAYER_STATUSES = ["active", "injured", "suspended", "inactive"] as const;
export type PlayerStatus = (typeof PLAYER_STATUSES)[number];

export const PLAYER_POSITIONS = ["goalkeeper", "defender", "midfielder", "forward"] as const;
export type PlayerPosition = (typeof PLAYER_POSITIONS)[number];

export const DOMINANT_FEET = ["left", "right", "both"] as const;
export type DominantFoot = (typeof DOMINANT_FEET)[number];

export const PLAYER_DOCUMENT_TYPES = [
  "medical_exam",
  "parent_consent",
  "club_declaration",
  "insurance",
  "document_photo",
  "other",
] as const;
export type PlayerDocumentType = (typeof PLAYER_DOCUMENT_TYPES)[number];

export const DOCUMENT_VALIDITY_STATUSES = ["valid", "expiring_soon", "expired"] as const;
export type DocumentValidityStatus = (typeof DOCUMENT_VALIDITY_STATUSES)[number];

export const PLAYER_HISTORY_EVENT_TYPES = [
  "transfer_in",
  "transfer_out",
  "previous_club",
  "position_change",
  "jersey_number_change",
] as const;
export type PlayerHistoryEventType = (typeof PLAYER_HISTORY_EVENT_TYPES)[number];

export const COACH_NOTE_TYPES = ["observation", "progress", "health", "training_goal"] as const;
export type CoachNoteType = (typeof COACH_NOTE_TYPES)[number];

export type DocumentAlertLevel = "expired" | "days_7" | "days_14" | "days_30";

export type Player = {
  id: string;
  clubId: string;
  teamId: string | null;
  firstName: string;
  lastName: string;
  photoUrl: string | null;
  dateOfBirth: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  jerseyNumber: number | null;
  primaryPosition: PlayerPosition | null;
  secondaryPosition: PlayerPosition | null;
  dominantFoot: DominantFoot | null;
  heightCm: number | null;
  weightKg: number | null;
  status: PlayerStatus;
  joinedAt: string | null;
  leftAt: string | null;
  teamName?: string | null;
};

export type PlayerDocument = {
  id: string;
  clubId: string;
  playerId: string;
  documentType: PlayerDocumentType;
  title: string;
  storagePath: string;
  fileName: string;
  mimeType: string | null;
  fileSize: number | null;
  expiresAt: string | null;
  notes: string | null;
  createdAt: string;
  validityStatus: DocumentValidityStatus;
  alertLevel: DocumentAlertLevel | null;
};

export type PlayerStats = {
  id: string;
  playerId: string;
  season: string;
  matchesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
};

export type PlayerClubHistory = {
  id: string;
  playerId: string;
  eventType: PlayerHistoryEventType;
  eventDate: string;
  description: string | null;
  previousValue: string | null;
  newValue: string | null;
  relatedClubName: string | null;
  createdAt: string;
};

export type PlayerInjury = {
  id: string;
  playerId: string;
  injuryDate: string;
  recoveryDate: string | null;
  description: string;
  severity: string | null;
  isActive: boolean;
};

export type PlayerCoachNote = {
  id: string;
  playerId: string;
  authorId: string;
  authorName: string | null;
  noteType: CoachNoteType;
  content: string;
  createdAt: string;
};

export type DocumentAlert = {
  documentId: string;
  playerId: string;
  playerName: string;
  documentTitle: string;
  documentType: PlayerDocumentType;
  expiresAt: string;
  alertLevel: DocumentAlertLevel;
};
