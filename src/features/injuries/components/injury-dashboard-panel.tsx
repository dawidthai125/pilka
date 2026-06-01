import Link from "next/link";

import type { InjuryDashboardStats } from "@/types/injuries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function InjuryDashboardPanel({ stats }: { stats: InjuryDashboardStats }) {
  const widgets = [
    { label: "Aktywne urazy", value: stats.activeInjuries, href: "/injuries/registry?status=active" },
    { label: "Rehabilitacje", value: stats.inRehabilitation, href: "/injuries/registry?status=rehabilitation" },
    { label: "Powroty do gry", value: stats.returningToMatch, href: "/injuries/registry" },
    { label: "Niedostępni", value: stats.unavailablePlayers, href: "/injuries/registry" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {widgets.map((w) => (
        <Link key={w.label} href={w.href}>
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{w.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{w.value}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
