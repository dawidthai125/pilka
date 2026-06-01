import Link from "next/link";

import { ContentCalendarView } from "@/features/content/components/content-calendar-view";
import { getDashboardContext, requireContentReadAccess } from "@/lib/auth/session";
import { getContentCalendarRange } from "@/lib/content/loaders";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function rangeForView(view: string) {
  const now = new Date();
  const from = new Date(now);
  const to = new Date(now);

  if (view === "day") {
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
  } else if (view === "week") {
    from.setDate(now.getDate() - now.getDay() + 1);
    from.setHours(0, 0, 0, 0);
    to.setDate(from.getDate() + 6);
    to.setHours(23, 59, 59, 999);
  } else {
    from.setDate(1);
    from.setHours(0, 0, 0, 0);
    to.setMonth(from.getMonth() + 1, 0);
    to.setHours(23, 59, 59, 999);
  }

  return { from: from.toISOString(), to: to.toISOString() };
}

export default async function ContentCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewRaw } = await searchParams;
  const view = viewRaw === "day" || viewRaw === "week" ? viewRaw : "month";
  const { access } = await getDashboardContext();
  requireContentReadAccess(access);

  const { from, to } = rangeForView(view);
  const entriesRaw = await getContentCalendarRange(access.clubId, from, to);
  const entries = entriesRaw.map((entry) => ({
    id: entry.id,
    scheduledAt: entry.scheduledAt,
    postTitle: entry.post?.title ?? null,
    postId: entry.postId,
    status: entry.post?.status ?? null,
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Kalendarz publikacji</h1>
        <div className="flex flex-wrap gap-2">
          {(["day", "week", "month"] as const).map((v) => (
            <Link
              key={v}
              href={`/content/calendar?view=${v}`}
              className={cn(buttonVariants({ variant: view === v ? "default" : "outline", size: "sm" }))}
            >
              {v === "day" ? "Dzień" : v === "week" ? "Tydzień" : "Miesiąc"}
            </Link>
          ))}
        </div>
      </div>
      <ContentCalendarView entries={entries} view={view} />
    </div>
  );
}
