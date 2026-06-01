import Link from "next/link";

import type { EquipmentDashboardStats } from "@/types/equipment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function EquipmentDashboardPanel({ stats }: { stats: EquipmentDashboardStats }) {
  const widgets = [
    { label: "Aktywne zasoby", value: stats.activeAssets, href: "/equipment/assets" },
    { label: "Do naprawy", value: stats.needsRepair, href: "/equipment/maintenance" },
    { label: "Wypożyczony sprzęt", value: stats.loanedOut, href: "/equipment/assignments" },
    {
      label: "Wartość majątku (PLN)",
      value: stats.totalValue.toLocaleString("pl-PL"),
      href: "/equipment/warehouse",
    },
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
