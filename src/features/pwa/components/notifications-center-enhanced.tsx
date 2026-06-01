"use client";

import { useMemo, useState } from "react";

import { markAllNotificationsRead } from "@/features/training/actions";
import { markNotificationReadOfflineAware } from "@/lib/pwa/offline-actions";
import type { ClubNotification } from "@/types/trainings";
import { Button } from "@/components/ui/button";
import { NotificationItem } from "@/features/pwa/components/notification-item";

const FILTERS = [
  { id: "all", label: "Wszystkie" },
  { id: "unread", label: "Nieprzeczytane" },
  { id: "training", label: "Treningi" },
  { id: "match", label: "Mecze" },
  { id: "finance", label: "Finanse" },
  { id: "ai", label: "AI" },
] as const;

type FilterId = (typeof FILTERS)[number]["id"];

function matchesFilter(notification: ClubNotification, filter: FilterId): boolean {
  if (filter === "all") return true;
  if (filter === "unread") return !notification.readAt;
  const haystack = `${notification.title} ${notification.body} ${notification.href ?? ""}`.toLowerCase();
  if (filter === "training") return haystack.includes("trening") || !!notification.trainingId;
  if (filter === "match") return haystack.includes("mecz");
  if (filter === "finance") return haystack.includes("składk") || haystack.includes("finans");
  if (filter === "ai") return haystack.includes("raport ai") || haystack.includes("ai");
  return true;
}

export function NotificationsCenterEnhanced({
  notifications,
}: {
  notifications: ClubNotification[];
}) {
  const [filter, setFilter] = useState<FilterId>("all");
  const [pending, setPending] = useState(false);

  const filtered = useMemo(
    () => notifications.filter((n) => matchesFilter(n, filter)),
    [notifications, filter],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant={filter === item.id ? "default" : "outline"}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => {
            setPending(true);
            void markAllNotificationsRead().finally(() => setPending(false));
          }}
        >
          Oznacz wszystkie jako przeczytane
        </Button>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Brak powiadomień w wybranym filtrze.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={(id) => {
                setPending(true);
                void markNotificationReadOfflineAware(id).finally(() => setPending(false));
              }}
              pending={pending}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
