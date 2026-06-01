import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ContentDashboardStats } from "@/types/content";

export function ContentDashboardStats({ stats }: { stats: ContentDashboardStats }) {
  const items = [
    { label: "Wszystkie materiały", value: stats.totalPosts },
    { label: "Do akceptacji", value: stats.pendingApproval },
    { label: "Zaplanowane", value: stats.scheduled },
    { label: "Opublikowane (miesiąc)", value: stats.publishedThisMonth },
    { label: "Kolejka social", value: stats.queuedSocial },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
