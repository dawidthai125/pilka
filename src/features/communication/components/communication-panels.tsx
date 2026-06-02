"use client";

import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  archiveAnnouncementAction,
  markAnnouncementReadAction,
  respondCoachMessageAction,
  sendChatMessageAction,
} from "@/features/communication/actions";
import {
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_PRIORITY_LABELS,
  ANNOUNCEMENT_STATUS_LABELS,
  ATTENDANCE_RESPONSE_LABELS,
  type Announcement,
  type ChatMessage,
  type CoachMessage,
  type CommunicationDashboardStats,
  type TeamChat,
} from "@/types/communication";

export function CommunicationStatsCards({ stats }: { stats: CommunicationDashboardStats }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {[
        { label: "Ogłoszenia", value: stats.publishedAnnouncements },
        { label: "Nieprzeczytane", value: stats.unreadAnnouncements },
        { label: "Komunikaty (7 dni)", value: stats.coachMessagesWeek },
        { label: "Aktywne czaty", value: stats.activeChats },
      ].map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AnnouncementsList({
  items,
  canManage,
  audienceSize = 24,
}: {
  items: Announcement[];
  canManage: boolean;
  audienceSize?: number;
}) {
  const [, startTransition] = useTransition();

  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Brak ogłoszeń do wyświetlenia.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const readCount = item.readCount ?? 0;
        const pct = audienceSize ? Math.round((readCount / audienceSize) * 100) : 0;
        return (
          <Card key={item.id} className={item.isRead ? "" : "border-primary/40"}>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <CardTitle className="text-base">{item.title}</CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {ANNOUNCEMENT_CATEGORY_LABELS[item.category]} · {ANNOUNCEMENT_PRIORITY_LABELS[item.priority]} ·{" "}
                    {ANNOUNCEMENT_STATUS_LABELS[item.status]}
                  </p>
                </div>
                {!item.isRead && item.status === "published" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => startTransition(() => void markAnnouncementReadAction(item.id))}
                  >
                    Oznacz przeczytane
                  </Button>
                ) : null}
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="whitespace-pre-wrap">{item.body}</p>
              {canManage && item.status === "published" ? (
                <p className="text-xs text-muted-foreground">
                  Przeczytało: {readCount}/{audienceSize} ({pct}%)
                </p>
              ) : null}
              {canManage && item.status !== "archived" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => startTransition(() => void archiveAnnouncementAction(item.id))}
                >
                  Archiwizuj
                </Button>
              ) : null}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function CoachMessagesList({ items, canCoach }: { items: CoachMessage[]; canCoach: boolean }) {
  const [, startTransition] = useTransition();

  if (!items.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Brak komunikatów trenera.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{item.title}</CardTitle>
            <p className="text-xs text-muted-foreground">{item.teamName ?? "Drużyna"}</p>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="whitespace-pre-wrap">{item.body}</p>
            {item.requiresAttendance && item.attendanceSummary ? (
              <p className="text-xs text-muted-foreground">
                Obecność: Tak {item.attendanceSummary.yes} · Nie {item.attendanceSummary.no} · Nie wiem{" "}
                {item.attendanceSummary.unknown}
              </p>
            ) : null}
            {item.requiresAttendance && item.status === "published" ? (
              <div className="flex flex-wrap gap-2">
                {(["yes", "no", "unknown"] as const).map((response) => (
                  <Button
                    key={response}
                    size="sm"
                    variant={item.userResponse === response ? "default" : "outline"}
                    onClick={() => startTransition(() => void respondCoachMessageAction(item.id, response))}
                  >
                    {ATTENDANCE_RESPONSE_LABELS[response]}
                  </Button>
                ))}
              </div>
            ) : null}
            {canCoach ? (
              <p className="text-xs text-muted-foreground">
                {item.status === "published" ? "Opublikowany" : "Szkic"}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function TeamChatsList({ chats }: { chats: TeamChat[] }) {
  if (!chats.length) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Brak aktywnych czatów drużynowych.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {chats.map((chat) => (
        <Link key={chat.id} href={`/communication/chats/${chat.id}`}>
          <Card className="transition hover:border-primary/50">
            <CardHeader>
              <CardTitle className="text-base">{chat.name}</CardTitle>
              <p className="text-xs text-muted-foreground">{chat.chatType}</p>
            </CardHeader>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function ChatThread({
  chatId,
  messages,
}: {
  chatId: string;
  messages: ChatMessage[];
}) {
  const [, startTransition] = useTransition();

  return (
    <div className="flex h-[min(70vh,640px)] flex-col rounded-xl border">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Brak wiadomości — napisz pierwszą.</p>
        ) : (
          messages.map((msg) => (
          <div key={msg.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <p className="text-xs font-medium text-muted-foreground">{msg.senderName ?? "Użytkownik"}</p>
            <p className="mt-1 whitespace-pre-wrap">{msg.body}</p>
          </div>
        ))
        )}
      </div>
      <form
        className="flex gap-2 border-t p-3"
        action={(formData) => {
          formData.set("chatId", chatId);
          startTransition(async () => {
            await sendChatMessageAction({}, formData);
          });
        }}
      >
        <input
          name="body"
          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Napisz wiadomość…"
          required
        />
        <Button type="submit" size="sm" className="min-h-11">
          Wyślij
        </Button>
      </form>
    </div>
  );
}
