import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoachAttendanceReport } from "@/types/attendance";

function StatList({ title, items }: { title: string; items: { playerName: string; seasonRate?: number; consecutiveAbsences?: number }[] }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {items.length === 0 ? (
          <p className="text-muted-foreground">Brak danych</p>
        ) : (
          items.map((item) => (
            <div key={item.playerName} className="flex justify-between gap-2">
              <span>{item.playerName}</span>
              <span className="text-muted-foreground">
                {"seasonRate" in item && item.seasonRate !== undefined
                  ? `${item.seasonRate}%`
                  : item.consecutiveAbsences
                    ? `${item.consecutiveAbsences}×`
                    : ""}
              </span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function CoachAttendanceReportPanel({ report }: { report: CoachAttendanceReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <StatList title="Najlepsza frekwencja" items={report.bestAttendance} />
      <StatList title="Najgorsza frekwencja" items={report.worstAttendance} />
      <StatList title="Nieobecności seryjne" items={report.serialAbsences} />
      <StatList title="Kontuzjowani" items={report.injured} />
    </div>
  );
}
