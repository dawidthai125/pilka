"use client";

import { useActionState, useTransition } from "react";

import {
  addVideoEventAction,
  addVideoNoteAction,
  approveVideoNewsDraftAction,
  confirmAiEventAction,
  createVideoClipAction,
  rejectVideoNewsDraftAction,
  reprocessVideoAction,
  type VideoActionState,
} from "@/features/video/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatVideoTimestamp } from "@/lib/video/mappers";
import {
  VIDEO_CLIP_CATEGORIES,
  VIDEO_CLIP_CATEGORY_LABELS,
  VIDEO_EVENT_TYPES,
  VIDEO_EVENT_TYPE_LABELS,
  VIDEO_NEWS_DRAFT_TYPE_LABELS,
  VIDEO_REPORT_TYPE_LABELS,
  type Video,
  type VideoClip,
  type VideoEvent,
  type VideoNewsDraft,
  type VideoNote,
  type VideoReport,
} from "@/types/video";

const emptyState: VideoActionState = {};

export function VideoDetailView({
  video,
  signedUrl,
  reports,
  events,
  notes,
  clips,
  drafts,
  canManage,
  canPublishNews,
}: {
  video: Video;
  signedUrl: string | null;
  reports: VideoReport[];
  events: VideoEvent[];
  notes: VideoNote[];
  clips: VideoClip[];
  drafts: VideoNewsDraft[];
  canManage: boolean;
  canPublishNews: boolean;
}) {
  const [eventState, eventAction, eventPending] = useActionState(addVideoEventAction, emptyState);
  const [noteState, noteAction, notePending] = useActionState(addVideoNoteAction, emptyState);
  const [clipState, clipAction, clipPending] = useActionState(createVideoClipAction, emptyState);
  const [reprocessPending, startReprocess] = useTransition();
  const [draftPending, startDraftAction] = useTransition();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{video.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {signedUrl ? (
            <video
              controls
              playsInline
              preload="metadata"
              className="aspect-video w-full rounded-lg bg-black"
              src={signedUrl}
            />
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed bg-muted/30 text-sm text-muted-foreground">
              Podgląd niedostępny (nagranie seed / brak pliku w storage).
            </div>
          )}
          {video.description ? <p className="text-sm text-muted-foreground">{video.description}</p> : null}
          {canManage ? (
            <Button
              type="button"
              variant="outline"
              disabled={reprocessPending}
              onClick={() => startReprocess(() => void reprocessVideoAction(video.id))}
            >
              {reprocessPending ? "Analiza…" : "Ponów analizę AI"}
            </Button>
          ) : null}
        </CardContent>
      </Card>

      {reports.map((report) => (
        <Card key={report.id}>
          <CardHeader>
            <CardTitle>{report.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{VIDEO_REPORT_TYPE_LABELS[report.reportType]}</p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {report.summary ? <p>{report.summary}</p> : null}
            <SectionList title="Mocne strony" items={report.strengths} />
            <SectionList title="Słabe strony" items={report.weaknesses} />
            <SectionList title="Rekomendacje trenerskie" items={report.coachingRecommendations} />
            {report.keyMoments.length > 0 ? (
              <div>
                <h4 className="mb-2 font-medium">Kluczowe momenty</h4>
                <ul className="space-y-1">
                  {report.keyMoments.map((moment, index) => (
                    <li key={index}>
                      {moment.minute != null ? `${moment.minute}' — ` : ""}
                      <strong>{moment.label}:</strong> {moment.description}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle>Timeline zdarzeń</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak zdarzeń.</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2 text-sm">
                <div>
                  <span className="font-mono text-muted-foreground">{formatVideoTimestamp(event.timestampSeconds)}</span>{" "}
                  <strong>{VIDEO_EVENT_TYPE_LABELS[event.eventType]}</strong>
                  {event.label ? ` — ${event.label}` : ""}
                  {event.description ? <p className="text-muted-foreground">{event.description}</p> : null}
                </div>
                <div className="flex gap-2">
                  <span className="text-xs text-muted-foreground">{event.source}</span>
                  {canManage && event.source === "ai_suggested" ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        startDraftAction(() => void confirmAiEventAction(event.id, video.id))
                      }
                    >
                      Potwierdź AI
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}

          {canManage ? (
            <form action={eventAction} className="grid gap-3 border-t pt-4 md:grid-cols-2">
              <input type="hidden" name="videoId" value={video.id} />
              {eventState.error ? <p className="text-destructive md:col-span-2">{eventState.error}</p> : null}
              {eventState.success ? <p className="text-green-700 md:col-span-2">{eventState.success}</p> : null}
              <div className="space-y-1">
                <Label>Typ</Label>
                <select name="eventType" className="flex h-10 w-full rounded-md border px-3 text-sm">
                  {VIDEO_EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {VIDEO_EVENT_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Czas (mm:ss)</Label>
                <Input name="timestamp" placeholder="12:34" required />
              </div>
              <div className="space-y-1 md:col-span-2">
                <Label>Opis</Label>
                <Input name="description" placeholder="Opcjonalny opis zdarzenia" />
              </div>
              <Button type="submit" disabled={eventPending} className="md:col-span-2 md:w-fit">
                Dodaj zdarzenie
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notatki trenera</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-md border px-3 py-2 text-sm">
              <span className="font-mono text-muted-foreground">{formatVideoTimestamp(note.timestampSeconds)}</span>
              <p className="mt-1">{note.content}</p>
            </div>
          ))}
          {canManage ? (
            <form action={noteAction} className="grid gap-3 border-t pt-4">
              <input type="hidden" name="videoId" value={video.id} />
              {noteState.error ? <p className="text-destructive">{noteState.error}</p> : null}
              {noteState.success ? <p className="text-green-700">{noteState.success}</p> : null}
              <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                <Input name="timestamp" placeholder="12:34" required />
                <textarea name="content" placeholder="Błąd ustawienia linii obrony…" required rows={2} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm" />
              </div>
              <Button type="submit" disabled={notePending} className="w-fit">
                Dodaj notatkę
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clip generator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {clips.map((clip) => (
            <div key={clip.id} className="rounded-md border px-3 py-2 text-sm">
              <strong>{clip.title}</strong> ({VIDEO_CLIP_CATEGORY_LABELS[clip.category]}) —{" "}
              {formatVideoTimestamp(clip.startSeconds)} → {formatVideoTimestamp(clip.endSeconds)}
            </div>
          ))}
          {canManage ? (
            <form action={clipAction} className="grid gap-3 border-t pt-4 md:grid-cols-2">
              <input type="hidden" name="videoId" value={video.id} />
              {clipState.error ? <p className="text-destructive md:col-span-2">{clipState.error}</p> : null}
              {clipState.success ? <p className="text-green-700 md:col-span-2">{clipState.success}</p> : null}
              <div className="space-y-1 md:col-span-2">
                <Label>Tytuł klipu</Label>
                <Input name="title" required />
              </div>
              <div className="space-y-1">
                <Label>Kategoria</Label>
                <select name="category" className="flex h-10 w-full rounded-md border px-3 text-sm">
                  {VIDEO_CLIP_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {VIDEO_CLIP_CATEGORY_LABELS[category]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label>Od — Do (mm:ss)</Label>
                <div className="flex gap-2">
                  <Input name="startTime" placeholder="22:40" required />
                  <Input name="endTime" placeholder="23:15" required />
                </div>
              </div>
              <Button type="submit" disabled={clipPending} className="md:col-span-2 md:w-fit">
                Zapisz klip
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>

      {drafts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>AI News Generator — szkice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-md border p-4 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <strong>{draft.title}</strong>
                  <span className="text-muted-foreground">{VIDEO_NEWS_DRAFT_TYPE_LABELS[draft.draftType]}</span>
                  <span className="text-xs uppercase text-muted-foreground">{draft.status}</span>
                </div>
                <p className="whitespace-pre-wrap text-muted-foreground">{draft.content}</p>
                {canPublishNews && draft.status === "pending_approval" ? (
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={draftPending}
                      onClick={() => startDraftAction(() => void approveVideoNewsDraftAction(draft.id))}
                    >
                      Zatwierdź
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={draftPending}
                      onClick={() => startDraftAction(() => void rejectVideoNewsDraftAction(draft.id))}
                    >
                      Odrzuć
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 font-medium">{title}</h4>
      <ul className="list-inside list-disc space-y-1">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
