"use client";

import Link from "next/link";
import { useTransition } from "react";

import type { ClubNotification } from "@/types/trainings";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationItem({
  notification,
  onMarkRead,
  pending,
}: {
  notification: ClubNotification;
  onMarkRead: (id: string) => void;
  pending?: boolean;
}) {
  const [, startTransition] = useTransition();
  const unread = !notification.readAt;

  const content = (
    <div
      className={cn(
        "rounded-xl border p-4 transition-colors",
        unread && "border-primary/30 bg-primary/5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{notification.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{notification.body}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(notification.scheduledAt).toLocaleString("pl-PL")}
          </p>
        </div>
        {unread ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={pending}
            onClick={(event) => {
              event.preventDefault();
              startTransition(() => onMarkRead(notification.id));
            }}
          >
            Oznacz
          </Button>
        ) : null}
      </div>
    </div>
  );

  if (notification.href) {
    return (
      <li>
        <Link href={notification.href} className="block hover:opacity-90">
          {content}
        </Link>
      </li>
    );
  }

  return <li>{content}</li>;
}
