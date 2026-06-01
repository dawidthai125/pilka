import type {
  AbsenceReason,
  AttendanceScope,
  AttendanceStatus,
  AvailabilityStatus,
  TrainingReminderType,
  TrainingStatus,
} from "@/types/trainings";

export const TRAINING_STATUS_LABELS: Record<TrainingStatus, string> = {
  planned: "Zaplanowany",
  completed: "Zakończony",
  cancelled: "Odwołany",
};

export const AVAILABILITY_STATUS_LABELS: Record<AvailabilityStatus, string> = {
  present: "Będę obecny",
  absent: "Nie będzie mnie",
  unknown: "Nie wiem",
};

export const ABSENCE_REASON_LABELS: Record<AbsenceReason, string> = {
  work: "Praca",
  school: "Szkoła",
  injury: "Kontuzja",
  travel: "Wyjazd",
  illness: "Choroba",
  vacation: "Urlop",
  family: "Sprawy rodzinne",
  other: "Inny",
};

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: "Obecny",
  absent: "Nieobecny",
  late: "Spóźniony",
  excused: "Usprawiedliwiony",
};

export const REMINDER_TYPE_LABELS: Record<TrainingReminderType, string> = {
  hours_48: "48 godzin przed treningiem",
  hours_24: "24 godziny przed treningiem",
  hours_3: "3 godziny przed treningiem",
};

export const ATTENDANCE_SCOPE_LABELS: Record<AttendanceScope, string> = {
  month: "Miesiąc",
  season: "Sezon",
  all: "Cały okres",
};

export const DEFAULT_SEASON = "2025/2026";

export const NOTIFICATION_CHANNELS = ["in_app", "email", "sms", "push"] as const;
