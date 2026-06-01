import { enrichDocument } from "@/lib/players/documents";
import type {
  CoachNoteType,
  DominantFoot,
  Player,
  PlayerClubHistory,
  PlayerCoachNote,
  PlayerDocument,
  PlayerDocumentType,
  PlayerHistoryEventType,
  PlayerInjury,
  PlayerPosition,
  PlayerStats,
  PlayerStatus,
} from "@/types/players";

type PlayerRow = {
  id: string;
  club_id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  photo_url: string | null;
  date_of_birth: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  jersey_number: number | null;
  primary_position: PlayerPosition | null;
  secondary_position: PlayerPosition | null;
  dominant_foot: DominantFoot | null;
  height_cm: number | null;
  weight_kg: number | null;
  status: PlayerStatus;
  joined_at: string | null;
  left_at: string | null;
  teams?: { name: string } | { name: string }[] | null;
};

export function mapPlayerListEntry(row: {
  id: string;
  club_id: string;
  team_id: string | null;
  first_name: string;
  last_name: string;
  jersey_number: number | null;
  primary_position: PlayerRow["primary_position"];
  dominant_foot: PlayerRow["dominant_foot"];
  status: PlayerRow["status"];
}): Player {
  return {
    id: row.id,
    clubId: row.club_id,
    teamId: row.team_id,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: null,
    dateOfBirth: "",
    phone: null,
    email: null,
    address: null,
    city: null,
    postalCode: null,
    jerseyNumber: row.jersey_number,
    primaryPosition: row.primary_position,
    secondaryPosition: null,
    dominantFoot: row.dominant_foot,
    heightCm: null,
    weightKg: null,
    status: row.status,
    joinedAt: null,
    leftAt: null,
    teamName: null,
  };
}

export function mapPlayer(row: PlayerRow): Player {
  const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

  return {
    id: row.id,
    clubId: row.club_id,
    teamId: row.team_id,
    firstName: row.first_name,
    lastName: row.last_name,
    photoUrl: row.photo_url,
    dateOfBirth: row.date_of_birth,
    phone: row.phone,
    email: row.email,
    address: row.address,
    city: row.city,
    postalCode: row.postal_code,
    jerseyNumber: row.jersey_number,
    primaryPosition: row.primary_position,
    secondaryPosition: row.secondary_position,
    dominantFoot: row.dominant_foot,
    heightCm: row.height_cm,
    weightKg: row.weight_kg ? Number(row.weight_kg) : null,
    status: row.status,
    joinedAt: row.joined_at,
    leftAt: row.left_at,
    teamName: team?.name ?? null,
  };
}

export function mapPlayerDocument(row: {
  id: string;
  club_id: string;
  player_id: string;
  document_type: PlayerDocumentType;
  title: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  expires_at: string | null;
  notes: string | null;
  created_at: string;
}): PlayerDocument {
  return enrichDocument({
    id: row.id,
    clubId: row.club_id,
    playerId: row.player_id,
    documentType: row.document_type,
    title: row.title,
    storagePath: row.storage_path,
    fileName: row.file_name,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    expiresAt: row.expires_at,
    notes: row.notes,
    createdAt: row.created_at,
  });
}

export function mapPlayerStats(row: {
  id: string;
  player_id: string;
  season: string;
  matches_played: number;
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
  minutes_played: number;
}): PlayerStats {
  return {
    id: row.id,
    playerId: row.player_id,
    season: row.season,
    matchesPlayed: row.matches_played,
    goals: row.goals,
    assists: row.assists,
    yellowCards: row.yellow_cards,
    redCards: row.red_cards,
    minutesPlayed: row.minutes_played,
  };
}

export function mapPlayerHistory(row: {
  id: string;
  player_id: string;
  event_type: PlayerHistoryEventType;
  event_date: string;
  description: string | null;
  previous_value: string | null;
  new_value: string | null;
  related_club_name: string | null;
  created_at: string;
}): PlayerClubHistory {
  return {
    id: row.id,
    playerId: row.player_id,
    eventType: row.event_type,
    eventDate: row.event_date,
    description: row.description,
    previousValue: row.previous_value,
    newValue: row.new_value,
    relatedClubName: row.related_club_name,
    createdAt: row.created_at,
  };
}

export function mapPlayerInjury(row: {
  id: string;
  player_id: string;
  injury_date: string;
  recovery_date: string | null;
  description: string;
  severity: string | null;
  is_active: boolean;
}): PlayerInjury {
  return {
    id: row.id,
    playerId: row.player_id,
    injuryDate: row.injury_date,
    recoveryDate: row.recovery_date,
    description: row.description,
    severity: row.severity,
    isActive: row.is_active,
  };
}

export function mapCoachNote(row: {
  id: string;
  player_id: string;
  author_id: string;
  note_type: CoachNoteType;
  content: string;
  created_at: string;
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null;
}): PlayerCoachNote {
  const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;

  return {
    id: row.id,
    playerId: row.player_id,
    authorId: row.author_id,
    authorName: profile?.full_name ?? null,
    noteType: row.note_type,
    content: row.content,
    createdAt: row.created_at,
  };
}

export function playerFullName(player: Pick<Player, "firstName" | "lastName">): string {
  return `${player.firstName} ${player.lastName}`;
}
