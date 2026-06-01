"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { upsertAnnouncementAction, upsertCoachMessageAction } from "@/features/communication/actions";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_CATEGORY_LABELS,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_PRIORITY_LABELS,
} from "@/types/communication";

type TeamOption = { id: string; name: string; category: string };

export function AnnouncementComposeForm({ teams }: { teams: TeamOption[] }) {
  const [state, action, pending] = useActionState(upsertAnnouncementAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Nowe ogłoszenie</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <input name="title" className="rounded-md border px-3 py-2 text-sm sm:col-span-2" placeholder="Tytuł" required />
          <textarea name="body" className="min-h-24 rounded-md border px-3 py-2 text-sm sm:col-span-2" placeholder="Treść" required />
          <select name="category" className="rounded-md border px-3 py-2 text-sm" defaultValue="club">
            {ANNOUNCEMENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {ANNOUNCEMENT_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
          <select name="priority" className="rounded-md border px-3 py-2 text-sm" defaultValue="normal">
            {ANNOUNCEMENT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {ANNOUNCEMENT_PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
          <select name="visibility" className="rounded-md border px-3 py-2 text-sm" defaultValue="all">
            <option value="all">Wszyscy</option>
            <option value="team">Konkretna drużyna</option>
            <option value="role">Konkretna rola</option>
          </select>
          <select name="targetTeamId" className="rounded-md border px-3 py-2 text-sm">
            <option value="">— drużyna —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <select name="status" className="rounded-md border px-3 py-2 text-sm" defaultValue="published">
            <option value="draft">Szkic</option>
            <option value="published">Publikuj</option>
          </select>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Zapisywanie…" : "Zapisz ogłoszenie"}
            </Button>
            {state.error ? <p className="mt-2 text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="mt-2 text-sm text-green-600">{state.success}</p> : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function CoachMessageComposeForm({ teams }: { teams: TeamOption[] }) {
  const [state, action, pending] = useActionState(upsertCoachMessageAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Komunikat trenera</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="grid gap-3">
          <select name="teamId" className="rounded-md border px-3 py-2 text-sm" required defaultValue={teams[0]?.id ?? ""}>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
          <input name="title" className="rounded-md border px-3 py-2 text-sm" placeholder="Tytuł" required />
          <textarea name="body" className="min-h-20 rounded-md border px-3 py-2 text-sm" placeholder="Treść" required />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="requiresAttendance" />
            Pytaj o obecność
          </label>
          <select name="status" className="rounded-md border px-3 py-2 text-sm" defaultValue="published">
            <option value="draft">Szkic</option>
            <option value="published">Wyślij drużynie</option>
          </select>
          <Button type="submit" disabled={pending}>
            {pending ? "Wysyłanie…" : "Zapisz komunikat"}
          </Button>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-green-600">{state.success}</p> : null}
        </form>
      </CardContent>
    </Card>
  );
}
