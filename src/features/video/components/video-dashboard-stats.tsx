import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VideoDashboardStats } from "@/types/video";

export function VideoDashboardStats({ stats }: { stats: VideoDashboardStats }) {
  const cards = [
    { label: "Nagrania w bibliotece", value: stats.recentCount },
    { label: "Oczekujące analizy", value: stats.pendingJobs },
    { label: "Raporty AI", value: stats.readyReports },
    { label: "Szkice do zatwierdzenia", value: stats.pendingNewsDrafts },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function VideoTopViewedList({ items }: { items: VideoDashboardStats["topViewed"] }) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Najczęściej oglądane</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/video/${item.id}`}
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
          >
            <span className="font-medium">{item.title}</span>
            <span className="text-muted-foreground">{item.viewCount} wyśw.</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
