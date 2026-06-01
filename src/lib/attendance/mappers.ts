import type {
  AbsenceReason,
  AttendanceStatus,
  AvailabilityStatus,
} from "@/types/trainings";
import type {
  AttendanceRecordRow,
  AvailabilityEventType,
  AvailabilityReason,
  MatchCallStatus,
  PlayerAvailabilityRow,
  SquadConfirmationResponse,
} from "@/types/attendance";

export function mapAvailabilityReason(row: {
  id: string;
  code: string;
  label_pl: string;
  absence_reason: AbsenceReason | null;
}): AvailabilityReason {
  return {
    id: String(row.id),
    code: String(row.code),
    labelPl: String(row.label_pl),
    absenceReason: row.absence_reason,
  };
}

export function mapPlayerAvailability(
  row: Record<string, unknown>,
  playerName?: string,
): PlayerAvailabilityRow {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    playerName,
    eventType: String(row.event_type) as AvailabilityEventType,
    trainingId: row.training_id ? String(row.training_id) : null,
    matchId: row.match_id ? String(row.match_id) : null,
    status: String(row.status) as AvailabilityStatus,
    absenceReason: (row.absence_reason as AbsenceReason | null) ?? null,
    comment: row.comment ? String(row.comment) : null,
    declaredAt: String(row.updated_at ?? row.created_at),
  };
}

export function mapAttendanceRecord(
  row: Record<string, unknown>,
  playerName?: string,
): AttendanceRecordRow {
  return {
    id: String(row.id),
    playerId: String(row.player_id),
    playerName,
    sourceType: String(row.source_type) as AttendanceRecordRow["sourceType"],
    trainingId: row.training_id ? String(row.training_id) : null,
    matchId: row.match_id ? String(row.match_id) : null,
    declaredAvailability: (row.declared_availability as AvailabilityStatus | null) ?? null,
    attendanceStatus: String(row.attendance_status) as AttendanceStatus,
    absenceReason: (row.absence_reason as AbsenceReason | null) ?? null,
    recordedAt: String(row.recorded_at),
  };
}

export function mapSquadResponse(raw: string): SquadConfirmationResponse | null {
  if (raw === "yes" || raw === "no" || raw === "unknown") return raw;
  return null;
}

export function mapMatchCallStatus(raw: string): MatchCallStatus | null {
  if (raw === "called_up" || raw === "reserve" || raw === "not_called_up") return raw;
  return null;
}

export const CALENDAR_STATUS_COLORS: Record<AvailabilityStatus, string> = {
  present: "bg-emerald-500",
  absent: "bg-red-500",
  unknown: "bg-amber-400",
  limited: "bg-orange-400",
};
