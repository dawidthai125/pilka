import type { AbsenceReason, AttendanceStatus, AvailabilityStatus } from "@/types/trainings";

export const AVAILABILITY_EVENT_TYPES = ["training", "match", "club_event"] as const;
export type AvailabilityEventType = (typeof AVAILABILITY_EVENT_TYPES)[number];

export const MATCH_CALL_STATUSES = ["called_up", "reserve", "not_called_up"] as const;
export type MatchCallStatus = (typeof MATCH_CALL_STATUSES)[number];

export const SQUAD_CONFIRMATION_RESPONSES = ["yes", "no", "unknown"] as const;
export type SquadConfirmationResponse = (typeof SQUAD_CONFIRMATION_RESPONSES)[number];

export const ATTENDANCE_RECORD_SOURCES = ["training", "match"] as const;
export type AttendanceRecordSource = (typeof ATTENDANCE_RECORD_SOURCES)[number];

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  present: "Dostępny",
  absent: "Niedostępny",
  unknown: "Niepewny",
};

export const ABSENCE_REASON_LABELS_157: Record<AbsenceReason, string> = {
  injury: "Kontuzja",
  illness: "Choroba",
  work: "Praca",
  school: "Szkoła",
  travel: "Podróż",
  vacation: "Urlop",
  family: "Sprawy rodzinne",
  other: "Inne",
};

export const MATCH_CALL_STATUS_LABELS: Record<MatchCallStatus, string> = {
  called_up: "Powołany",
  reserve: "Rezerwowy",
  not_called_up: "Niepowołany",
};

export const SQUAD_CONFIRMATION_LABELS: Record<SquadConfirmationResponse, string> = {
  yes: "Potwierdzam",
  no: "Nie mogę",
  unknown: "Nie wiem",
};

export type AvailabilityReason = {
  id: string;
  code: string;
  labelPl: string;
  absenceReason: AbsenceReason | null;
};

export type PlayerAvailabilityRow = {
  id: string;
  playerId: string;
  playerName?: string;
  eventType: AvailabilityEventType;
  trainingId: string | null;
  matchId: string | null;
  status: AvailabilityStatus;
  absenceReason: AbsenceReason | null;
  comment: string | null;
  declaredAt: string;
};

export type AttendanceRecordRow = {
  id: string;
  playerId: string;
  playerName?: string;
  sourceType: AttendanceRecordSource;
  trainingId: string | null;
  matchId: string | null;
  declaredAvailability: AvailabilityStatus | null;
  attendanceStatus: AttendanceStatus;
  absenceReason: AbsenceReason | null;
  recordedAt: string;
};

export type PlayerFrequencyStats = {
  playerId: string;
  playerName: string;
  trainingRate: number;
  matchRate: number;
  monthRate: number;
  seasonRate: number;
  consecutiveAbsences: number;
  isInjured: boolean;
};

export type CoachAttendanceReport = {
  bestAttendance: PlayerFrequencyStats[];
  worstAttendance: PlayerFrequencyStats[];
  serialAbsences: PlayerFrequencyStats[];
  injured: PlayerFrequencyStats[];
};

export type AttendanceDashboardWidgets = {
  nextTrainingAvailable: number;
  nextTrainingTotal: number;
  nextMatchAvailable: number;
  nextMatchTotal: number;
  rosterGaps: number;
  injuredCount: number;
  nextTrainingId: string | null;
  nextMatchId: string | null;
};

export type CalendarDayAvailability = {
  date: string;
  status: AvailabilityStatus;
  eventType: AvailabilityEventType;
  eventId: string;
  label: string;
};

export type MatchSquadCallRow = {
  playerId: string;
  playerName: string;
  squadRole: string;
  callStatus: MatchCallStatus;
  userResponse: SquadConfirmationResponse | null;
};

export type AttendanceAiInsight = {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
};

export type AttendanceCalendarView = "player" | "coach" | "team";
