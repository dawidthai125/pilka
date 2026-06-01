import { StatsGrid } from "@/components/ui/stats-grid";
import type { ContentDashboardStats } from "@/types/content";

export function ContentDashboardStats({ stats }: { stats: ContentDashboardStats }) {
  const items = [
    { label: "Wszystkie materiały", value: stats.totalPosts },
    { label: "Do akceptacji", value: stats.pendingApproval },
    { label: "Zaplanowane", value: stats.scheduled },
    { label: "Opublikowane (miesiąc)", value: stats.publishedThisMonth },
    { label: "Kolejka social", value: stats.queuedSocial },
  ];

  return <StatsGrid items={items} columns="5" variant="card" />;
}
