import { CALENDAR_STATUS_COLORS } from "@/lib/attendance/constants";
import { AVAILABILITY_STATUS_LABELS } from "@/types/attendance";
import type { CalendarDayAvailability } from "@/types/attendance";
import type { AvailabilityStatus } from "@/types/trainings";

export function AvailabilityCalendarGrid({
  month,
  days,
}: {
  month: string;
  days: CalendarDayAvailability[];
}) {
  const byDate = new Map<string, CalendarDayAvailability[]>();
  for (const day of days) {
    const list = byDate.get(day.date) ?? [];
    list.push(day);
    byDate.set(day.date, list);
  }

  const [yStr, mStr] = month.split("-");
  const y = Number(yStr);
  const m = Number(mStr);
  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0).getDate();
  const startPad = (first.getDay() + 6) % 7;

  const cells: { date: string | null; items: CalendarDayAvailability[] }[] = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, items: [] });
  for (let d = 1; d <= last; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    cells.push({ date, items: byDate.get(date) ?? [] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        {(["present", "absent", "unknown"] as AvailabilityStatus[]).map((status) => (
          <span key={status} className="inline-flex items-center gap-1">
            <span className={`size-3 rounded-full ${CALENDAR_STATUS_COLORS[status]}`} />
            {AVAILABILITY_STATUS_LABELS[status]}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
          <div key={d} className="py-1">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, idx) => (
          <div
            key={idx}
            className="min-h-16 rounded-md border bg-card p-1 text-left text-xs"
          >
            {cell.date ? <span className="font-medium">{cell.date.slice(-2)}</span> : null}
            <div className="mt-1 space-y-0.5">
              {cell.items.slice(0, 2).map((item) => (
                <div
                  key={`${item.eventType}-${item.eventId}`}
                  className={`truncate rounded px-1 py-0.5 text-[10px] text-white ${CALENDAR_STATUS_COLORS[item.status]}`}
                  title={item.label}
                >
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
