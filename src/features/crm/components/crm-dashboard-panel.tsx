import Link from "next/link";

import type { CrmDashboardStats } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CrmDashboardPanel({ stats }: { stats: CrmDashboardStats }) {
  const widgets = [
    { label: "Aktywni sponsorzy", value: stats.activeSponsors, href: "/crm/pipeline" },
    { label: "Nowe kontakty", value: stats.newContacts, href: "/crm/contacts" },
    { label: "Zadania CRM", value: stats.openTasks, href: "/crm/tasks" },
    { label: "Darowizny (PLN)", value: stats.donationsTotal.toLocaleString("pl-PL"), href: "/crm/donations" },
    { label: "Nadchodzące wydarzenia", value: stats.upcomingEvents, href: "/crm/events" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
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
