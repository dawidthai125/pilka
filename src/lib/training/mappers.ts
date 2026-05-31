import type {
  AttendanceScope,
  AttendanceStatus,
  ClubNotification,
  PlayerAttendanceStats,
  Training,
  TrainingAttendance,
  TrainingAvailability,
  TrainingSessionNote,
} from "@/types/trainings";
import { formatIsoDate } from "@/lib/training/calendar";

type TrainingRow = {
  id: string;
  club_id: string;
  team_id: string;
  name: string;
  training_date: string;
  start_time: string;
  end_time: string;
  location: string | null;
  description: string | null;
  coach_user_id: string | null;
  status: Training["status"];
  teams?: { name: string } | null;
  profiles?: { full_name: string | null } | null;
};

export function mapTraining(row: TrainingRow): Training {
  return {
    id: row.id,
    clubId: row.club_id,
    teamId: row.team_id,
    teamName: row.teams?.name ?? null,
    name: row.name,
    trainingDate: row.training_date,
    startTime: row.start_time.slice(0, 5),
    endTime: row.end_time.slice(0, 5),
    location: row.location,
    description: row.description,
    coachUserId: row.coach_user_id,
    coachName: row.profiles?.full_name ?? null,
    status: row.status,
  };
}

export function mapAvailability(row: {
  id: string;
  training_id: string;
  player_id: string;
  status: TrainingAvailability["status"];
  absence_reason: TrainingAvailability["absenceReason"];
  notes: string | null;
  playerName?: string;
  players?: { first_name: string; last_name: string } | null;
}): TrainingAvailability {
  return {
    id: row.id,
    trainingId: row.training_id,
    playerId: row.player_id,
    playerName:
      row.playerName ??
      (row.players ? `${row.players.first_name} ${row.players.last_name}` : "Zawodnik"),
    status: row.status,
    absenceReason: row.absence_reason,
    notes: row.notes,
  };
}

export function mapAttendance(row: {
  id: string;
  training_id: string;
  player_id: string;
  status: AttendanceStatus;
  notes: string | null;
  playerName?: string;
  players?: { first_name: string; last_name: string } | null;
}): TrainingAttendance {
  return {
    id: row.id,
    trainingId: row.training_id,
    playerId: row.player_id,
    playerName:
      row.playerName ??
      (row.players ? `${row.players.first_name} ${row.players.last_name}` : "Zawodnik"),
    status: row.status,
    notes: row.notes,
  };
}

export function mapClubNotification(row: {
  id: string;
  club_id: string;
  training_id: string | null;
  reminder_type: ClubNotification["reminderType"];
  title: string;
  body: string;
  href: string | null;
  scheduled_at: string;
  read_at: string | null;
}): ClubNotification {
  return {
    id: row.id,
    clubId: row.club_id,
    trainingId: row.training_id,
    reminderType: row.reminder_type,
    title: row.title,
    body: row.body,
    href: row.href,
    scheduledAt: row.scheduled_at,
    readAt: row.read_at,
  };
}

export function mapSessionNote(row: {
  id: string;
  training_id: string;
  author_id: string;
  player_id: string | null;
  content: string;
  created_at: string;
  playerName?: string | null;
  profiles?: { full_name: string | null } | null;
  players?: { first_name: string; last_name: string } | null;
}): TrainingSessionNote {
  return {
    id: row.id,
    trainingId: row.training_id,
    authorId: row.author_id,
    authorName: row.profiles?.full_name ?? null,
    playerId: row.player_id,
    playerName:
      row.playerName ??
      (row.players ? `${row.players.first_name} ${row.players.last_name}` : null),
    content: row.content,
    createdAt: row.created_at,
  };
}

export function getScopeDateFrom(scope: AttendanceScope, reference = new Date()): string | null {
  if (scope === "all") return null;

  if (scope === "month") {
    const start = new Date(reference.getFullYear(), reference.getMonth(), 1);
    return formatIsoDate(start);
  }

  const year = reference.getMonth() >= 6 ? reference.getFullYear() : reference.getFullYear() - 1;
  return `${year}-07-01`;
}

export function computePlayerStats(
  rows: Array<{
    playerId: string;
    playerName: string;
    status: AttendanceStatus;
  }>,
): PlayerAttendanceStats[] {
  const map = new Map<
    string,
    { playerName: string; present: number; absent: number; late: number; excused: number }
  >();

  for (const row of rows) {
    const current = map.get(row.playerId) ?? {
      playerName: row.playerName,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
    };

    if (row.status === "present") current.present += 1;
    if (row.status === "absent") current.absent += 1;
    if (row.status === "late") current.late += 1;
    if (row.status === "excused") current.excused += 1;

    map.set(row.playerId, current);
  }

  return [...map.entries()]
    .map(([playerId, stats]) => {
      const total = stats.present + stats.absent + stats.late + stats.excused;
      const attendanceRate = total
        ? Math.round(((stats.present + stats.late + stats.excused) / total) * 100)
        : 0;
      const punctualityRate = total
        ? Math.round((stats.present / (stats.present + stats.late || 1)) * 100)
        : 0;
      const engagementScore = Math.round(attendanceRate * 0.7 + punctualityRate * 0.3);

      return {
        playerId,
        playerName: stats.playerName,
        present: stats.present,
        absent: stats.absent,
        late: stats.late,
        excused: stats.excused,
        total,
        attendanceRate,
        punctualityRate,
        engagementScore,
      };
    })
    .sort((a, b) => b.engagementScore - a.engagementScore);
}
