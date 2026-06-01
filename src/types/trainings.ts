export const TRAINING_STATUSES = ["planned", "completed", "cancelled"] as const;
export type TrainingStatus = (typeof TRAINING_STATUSES)[number];

export const AVAILABILITY_STATUSES = ["present", "absent", "unknown", "limited"] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export const ABSENCE_REASONS = ["work", "school", "injury", "travel", "illness", "vacation", "family", "other"] as const;
export type AbsenceReason = (typeof ABSENCE_REASONS)[number];

export const ATTENDANCE_STATUSES = ["present", "absent", "late", "excused"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export const TRAINING_REMINDER_TYPES = ["hours_48", "hours_24", "hours_3"] as const;
export type TrainingReminderType = (typeof TRAINING_REMINDER_TYPES)[number];

export type CalendarView = "month" | "week" | "day";

export type AttendanceScope = "month" | "season" | "all";

export type Training = {
  id: string;
  clubId: string;
  teamId: string;
  teamName: string | null;
  name: string;
  trainingDate: string;
  startTime: string;
  endTime: string;
  location: string | null;
  description: string | null;
  coachUserId: string | null;
  coachName: string | null;
  status: TrainingStatus;
};

export type TrainingAvailability = {
  id: string;
  trainingId: string;
  playerId: string;
  playerName: string;
  status: AvailabilityStatus;
  absenceReason: AbsenceReason | null;
  notes: string | null;
};

export type TrainingAttendance = {
  id: string;
  trainingId: string;
  playerId: string;
  playerName: string;
  status: AttendanceStatus;
  notes: string | null;
};

export type TrainingSessionNote = {
  id: string;
  trainingId: string;
  authorId: string;
  authorName: string | null;
  playerId: string | null;
  playerName: string | null;
  content: string;
  createdAt: string;
};

export type ClubNotification = {
  id: string;
  clubId: string;
  trainingId: string | null;
  reminderType: TrainingReminderType | null;
  title: string;
  body: string;
  href: string | null;
  scheduledAt: string;
  readAt: string | null;
};

export type PlayerAttendanceStats = {
  playerId: string;
  playerName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendanceRate: number;
  punctualityRate: number;
  engagementScore: number;
};

export type CoachDashboardData = {
  upcomingTrainings: Training[];
  confirmedCount: number;
  unconfirmedCount: number;
  injuredPlayers: Array<{ id: string; name: string }>;
  topEngaged: PlayerAttendanceStats[];
  leastEngaged: PlayerAttendanceStats[];
};
