import type { CalendarView, Training } from "@/types/trainings";

export function startOfWeek(date: Date): Date {
  const result = new Date(date);
  const day = result.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function parseLocalDate(iso: string): Date {
  const [yearRaw, monthRaw, dayRaw] = iso.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  const day = Number(dayRaw);
  return new Date(year, month - 1, day);
}

export function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCalendarRange(view: CalendarView, anchor: Date): { from: string; to: string } {
  if (view === "day") {
    const iso = formatIsoDate(anchor);
    return { from: iso, to: iso };
  }

  if (view === "week") {
    const start = startOfWeek(anchor);
    const end = addDays(start, 6);
    return { from: formatIsoDate(start), to: formatIsoDate(end) };
  }

  const start = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return { from: formatIsoDate(start), to: formatIsoDate(end) };
}

export function groupTrainingsByDate(trainings: Training[]): Map<string, Training[]> {
  const map = new Map<string, Training[]>();
  for (const training of trainings) {
    const list = map.get(training.trainingDate) ?? [];
    list.push(training);
    map.set(training.trainingDate, list);
  }
  return map;
}

export function monthGridDates(anchor: Date): Date[] {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const gridStart = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}
