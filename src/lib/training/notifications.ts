import type { TrainingReminderType } from "@/types/trainings";

const REMINDER_OFFSETS: Record<TrainingReminderType, number> = {
  hours_48: 48 * 60 * 60 * 1000,
  hours_24: 24 * 60 * 60 * 1000,
  hours_3: 3 * 60 * 60 * 1000,
};

export const CLUB_WALL_CLOCK_OFFSET_HOURS = 2;

export function trainingStartsAt(trainingDate: string, startTime: string): Date {
  const [yearRaw, monthRaw, dayRaw] = trainingDate.split("-");
  const [hourRaw, minuteRaw] = startTime.split(":");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  return new Date(
    Date.UTC(year, month - 1, day, hour, minute) - CLUB_WALL_CLOCK_OFFSET_HOURS * 60 * 60 * 1000,
  );
}

export function reminderScheduledAt(
  trainingDate: string,
  startTime: string,
  reminderType: TrainingReminderType,
): Date {
  const start = trainingStartsAt(trainingDate, startTime);
  return new Date(start.getTime() - REMINDER_OFFSETS[reminderType]);
}

export function isNotificationDue(scheduledAt: string, now = new Date()): boolean {
  return new Date(scheduledAt).getTime() <= now.getTime();
}

export function buildReminderCopy(
  trainingName: string,
  trainingDate: string,
  startTime: string,
  reminderType: TrainingReminderType,
): { title: string; body: string } {
  const labels = {
    hours_48: "48 godzin",
    hours_24: "24 godziny",
    hours_3: "3 godziny",
  } as const;

  return {
    title: "Przypomnienie o treningu",
    body: `${trainingName} za ${labels[reminderType]} — ${trainingDate} o ${startTime}`,
  };
}
