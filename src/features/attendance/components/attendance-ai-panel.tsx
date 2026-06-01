import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceAiInsight } from "@/types/attendance";

const severityClass: Record<AttendanceAiInsight["severity"], string> = {
  info: "border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30",
  warning: "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30",
  critical: "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30",
};

export function AttendanceAiPanel({ insights }: { insights: AttendanceAiInsight[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Rekomendacje AI — bez automatycznych decyzji. Trener podejmuje ostateczne działania.
      </p>
      {insights.map((item) => (
        <Card key={item.id} className={severityClass[item.severity]}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{item.title}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{item.body}</CardContent>
        </Card>
      ))}
    </div>
  );
}
