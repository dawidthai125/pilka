import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceDashboardWidgets } from "@/types/attendance";

export function AttendanceDashboardWidgetsPanel({ widgets }: { widgets: AttendanceDashboardWidgets }) {
  const cards = [
    {
      title: "Dostępni — trening",
      value: `${widgets.nextTrainingAvailable}/${widgets.nextTrainingTotal || "—"}`,
      href: widgets.nextTrainingId ? `/training/${widgets.nextTrainingId}` : "/training",
    },
    {
      title: "Dostępni — mecz",
      value: `${widgets.nextMatchAvailable}/${widgets.nextMatchTotal || "—"}`,
      href: widgets.nextMatchId ? `/attendance/matches/${widgets.nextMatchId}` : "/matches",
    },
    { title: "Braki kadrowe", value: String(widgets.rosterGaps), href: "/attendance/coach" },
    { title: "Kontuzjowani", value: String(widgets.injuredCount), href: "/players" },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="transition-colors hover:border-primary/40">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
