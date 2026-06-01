import Link from "next/link";

import { CONTENT_CHANNEL_LABELS, CONTENT_STATUS_LABELS, type ContentChannelVariant } from "@/types/content";

export function ContentCalendarView({
  entries,
  view,
}: {
  entries: Array<{ id: string; scheduledAt: string; postTitle: string | null; postId: string; status: string | null }>;
  view: "day" | "week" | "month";
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Widok: {view === "day" ? "dzień" : view === "week" ? "tydzień" : "miesiąc"}
      </p>
      {entries.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Brak zaplanowanych publikacji w tym okresie.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium">{entry.postTitle ?? "Materiał"}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(entry.scheduledAt).toLocaleString("pl-PL")}
                  {entry.status ? ` · ${CONTENT_STATUS_LABELS[entry.status as keyof typeof CONTENT_STATUS_LABELS] ?? entry.status}` : ""}
                </p>
              </div>
              <Link href={`/content/posts/${entry.postId}`} className="text-sm text-primary underline-offset-4 hover:underline">
                Szczegóły
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ContentChannelQueue({ variants }: { variants: ContentChannelVariant[] }) {
  const queued = variants.filter((v) => v.status === "queued" || v.status === "approved");

  if (queued.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Kolejka publikacji social jest pusta. Na tym etapie nie wysyłamy automatycznie — tylko draft + zatwierdzenie.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {queued
        .sort((a, b) => a.queuePosition - b.queuePosition)
        .map((variant) => (
          <li key={variant.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">{variant.title ?? "Bez tytułu"}</p>
              <p className="text-xs text-muted-foreground">
                {CONTENT_CHANNEL_LABELS[variant.channel]} · pozycja {variant.queuePosition}
              </p>
            </div>
            <Link href={`/content/posts/${variant.postId}`} className="text-sm text-primary underline-offset-4 hover:underline">
              Edytuj
            </Link>
          </li>
        ))}
    </ul>
  );
}
