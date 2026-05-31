"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  addCoachNote,
  addPlayerHistoryEntry,
  addPlayerInjury,
  deletePlayerDocument,
  getDocumentSignedUrl,
  uploadPlayerDocument,
  uploadPlayerPhoto,
  updatePlayerStats,
  type PlayerActionState,
} from "@/features/players/actions";
import { PlayerStatusBadge } from "@/features/players/components/player-status-badge";
import {
  COACH_NOTE_TYPE_LABELS,
  DOCUMENT_VALIDITY_LABELS,
  DOMINANT_FOOT_LABELS,
  PLAYER_DOCUMENT_TYPE_LABELS,
  PLAYER_HISTORY_EVENT_LABELS,
  PLAYER_POSITION_LABELS,
  PLAYER_STATUS_LABELS,
} from "@/lib/players/constants";
import { playerFullName } from "@/lib/players/mappers";
import type { PlayerDetailData } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

const initialState: PlayerActionState = {};
const selectClassName =
  "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

const tabs = [
  { id: "basic", label: "Dane podstawowe" },
  { id: "documents", label: "Dokumenty" },
  { id: "stats", label: "Statystyki" },
  { id: "development", label: "Rozwój" },
  { id: "history", label: "Historia klubowa" },
  { id: "injuries", label: "Historia kontuzji" },
  { id: "notes", label: "Notatki trenerskie" },
] as const;

type TabId = (typeof tabs)[number]["id"];

function resolveInitialTab(
  initialTab: string | undefined,
  visibleTabs: Array<(typeof tabs)[number]>,
): TabId {
  if (initialTab && visibleTabs.some((entry) => entry.id === initialTab)) {
    return initialTab as TabId;
  }

  return "basic";
}

export function PlayerDetailView({
  data,
  canManage,
  canViewNotes,
  initialTab,
}: {
  data: PlayerDetailData;
  canManage: boolean;
  canViewNotes: boolean;
  initialTab?: string;
}) {
  const visibleTabs = tabs.filter((tab) => tab.id !== "notes" || canViewNotes);
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    resolveInitialTab(initialTab, visibleTabs),
  );
  const { player } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {playerFullName(player)}
            </h1>
            {player.jerseyNumber ? (
              <Badge variant="outline">#{player.jerseyNumber}</Badge>
            ) : null}
            <PlayerStatusBadge status={player.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {player.teamName ?? "Bez drużyny"}
            {player.primaryPosition
              ? ` · ${PLAYER_POSITION_LABELS[player.primaryPosition]}`
              : ""}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-1 rounded-lg border bg-muted/30 p-1">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "min-h-11 rounded-md px-3 py-2 text-sm whitespace-nowrap transition-colors",
                activeTab === tab.id
                  ? "bg-background font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "basic" ? (
        <BasicTab player={player} canManage={canManage} />
      ) : null}
      {activeTab === "documents" ? (
        <DocumentsTab data={data} canManage={canManage} />
      ) : null}
      {activeTab === "stats" ? <StatsTab data={data} canManage={canManage} /> : null}
      {activeTab === "development" ? (
        <Card>
          <CardHeader>
            <CardTitle>Rozwój zawodnika</CardTitle>
            <CardDescription>Oceny trenerskie, cele, testy motoryczne i wykresy postępów.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href={`/academy/development/${player.id}`}
              className="inline-flex min-h-[44px] items-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
            >
              Otwórz pełny profil rozwoju
            </Link>
          </CardContent>
        </Card>
      ) : null}
      {activeTab === "history" ? (
        <HistoryTab playerId={player.id} history={data.history} canManage={canManage} />
      ) : null}
      {activeTab === "injuries" ? (
        <InjuriesTab playerId={player.id} injuries={data.injuries} canManage={canManage} />
      ) : null}
      {activeTab === "notes" && canViewNotes ? (
        <NotesTab playerId={player.id} notes={data.notes} />
      ) : null}
    </div>
  );
}

function BasicTab({
  player,
  canManage,
}: {
  player: PlayerDetailData["player"];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    uploadPlayerPhoto.bind(null, player.id),
    initialState,
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dane osobowe</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <InfoRow label="Data urodzenia" value={player.dateOfBirth} />
          <InfoRow label="Telefon" value={player.phone} />
          <InfoRow label="Email" value={player.email} />
          <InfoRow label="Adres" value={player.address} />
          <InfoRow label="Miejscowość" value={player.city} />
          <InfoRow label="Kod pocztowy" value={player.postalCode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dane piłkarskie</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm">
          <InfoRow label="Drużyna" value={player.teamName} />
          <InfoRow label="Numer" value={player.jerseyNumber?.toString()} />
          <InfoRow
            label="Pozycja główna"
            value={
              player.primaryPosition
                ? PLAYER_POSITION_LABELS[player.primaryPosition]
                : null
            }
          />
          <InfoRow
            label="Pozycja dodatkowa"
            value={
              player.secondaryPosition
                ? PLAYER_POSITION_LABELS[player.secondaryPosition]
                : null
            }
          />
          <InfoRow
            label="Dominująca noga"
            value={player.dominantFoot ? DOMINANT_FOOT_LABELS[player.dominantFoot] : null}
          />
          <InfoRow label="Wzrost" value={player.heightCm ? `${player.heightCm} cm` : null} />
          <InfoRow label="Waga" value={player.weightKg ? `${player.weightKg} kg` : null} />
          <InfoRow label="Status" value={PLAYER_STATUS_LABELS[player.status]} />
          <InfoRow label="Dołączenie" value={player.joinedAt} />
          <InfoRow label="Odejście" value={player.leftAt} />
        </CardContent>
      </Card>

      {canManage ? (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Zdjęcie profilowe</CardTitle>
          </CardHeader>
          <form action={action} className="space-y-3 px-6 pb-6">
            {state.error ? (
              <p className="text-sm text-destructive">{state.error}</p>
            ) : null}
            {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}
            <Input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
            <Button type="submit" disabled={pending} size="sm">
              {pending ? "Przesyłanie..." : "Prześlij zdjęcie"}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}

function DocumentsTab({
  data,
  canManage,
}: {
  data: PlayerDetailData;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    uploadPlayerDocument.bind(null, data.player.id),
    initialState,
  );
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dodaj dokument</CardTitle>
          </CardHeader>
          <form action={action} className="grid gap-4 px-6 pb-6 md:grid-cols-2">
            {state.error ? (
              <p className="text-sm text-destructive md:col-span-2">{state.error}</p>
            ) : null}
            {state.success ? (
              <p className="text-sm text-primary md:col-span-2">{state.success}</p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="title">Tytuł</Label>
              <Input id="title" name="title" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentType">Typ</Label>
              <select id="documentType" name="documentType" className={selectClassName} required>
                {Object.entries(PLAYER_DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="expiresAt">Data ważności</Label>
              <Input id="expiresAt" name="expiresAt" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Plik (PDF / JPG / PNG)</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notatka</Label>
              <Input id="notes" name="notes" />
            </div>
            <Button type="submit" disabled={pending} className="md:col-span-2">
              {pending ? "Dodawanie..." : "Dodaj dokument"}
            </Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lista dokumentów</CardTitle>
          <CardDescription>Status ważności aktualizowany automatycznie.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {actionMessage ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {actionMessage}
            </p>
          ) : null}
          {data.documents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Brak dokumentów.</p>
          ) : (
            data.documents.map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium">{doc.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {PLAYER_DOCUMENT_TYPE_LABELS[doc.documentType]} · dodano{" "}
                    {new Date(doc.createdAt).toLocaleDateString("pl-PL")}
                    {doc.expiresAt
                      ? ` · ważny do ${new Date(doc.expiresAt).toLocaleDateString("pl-PL")}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      doc.validityStatus === "expired"
                        ? "destructive"
                        : doc.validityStatus === "expiring_soon"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {DOCUMENT_VALIDITY_LABELS[doc.validityStatus]}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActionMessage(null);
                      startTransition(async () => {
                        const result = await getDocumentSignedUrl(doc.storagePath);
                        if (result.error) {
                          setActionMessage(result.error);
                          return;
                        }
                        if (result.url) window.open(result.url, "_blank");
                      });
                    }}
                  >
                    Pobierz
                  </Button>
                  {canManage ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setActionMessage(null);
                        startTransition(async () => {
                          const result = await deletePlayerDocument(doc.id, data.player.id);
                          if (result.error) {
                            setActionMessage(result.error);
                          }
                        });
                      }}
                    >
                      Usuń
                    </Button>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatsTab({
  data,
  canManage,
}: {
  data: PlayerDetailData;
  canManage: boolean;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {data.stats.length === 0 ? (
        <Card className="md:col-span-2">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Brak statystyk sezonowych.
          </CardContent>
        </Card>
      ) : (
        data.stats.map((stat) => (
          <StatsCard key={stat.id} stat={stat} playerId={data.player.id} canManage={canManage} />
        ))
      )}
    </div>
  );
}

function StatsCard({
  stat,
  playerId,
  canManage,
}: {
  stat: PlayerDetailData["stats"][number];
  playerId: string;
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    updatePlayerStats.bind(null, playerId, stat.id),
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sezon {stat.season}</CardTitle>
      </CardHeader>
      {canManage ? (
        <form action={action} className="space-y-3 px-6 pb-6">
          <div className="grid grid-cols-2 gap-3">
            <Field name="matchesPlayed" label="Mecze" defaultValue={stat.matchesPlayed} />
            <Field name="goals" label="Gole" defaultValue={stat.goals} />
            <Field name="assists" label="Asysty" defaultValue={stat.assists} />
            <Field name="yellowCards" label="Żółte" defaultValue={stat.yellowCards} />
            <Field name="redCards" label="Czerwone" defaultValue={stat.redCards} />
            <Field name="minutesPlayed" label="Minuty" defaultValue={stat.minutesPlayed} />
          </div>
          {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}
          <Button type="submit" size="sm" disabled={pending}>
            Zapisz
          </Button>
        </form>
      ) : (
        <CardContent className="grid grid-cols-2 gap-2 text-sm">
          <InfoRow label="Mecze" value={String(stat.matchesPlayed)} />
          <InfoRow label="Gole" value={String(stat.goals)} />
          <InfoRow label="Asysty" value={String(stat.assists)} />
          <InfoRow label="Żółte kartki" value={String(stat.yellowCards)} />
          <InfoRow label="Czerwone kartki" value={String(stat.redCards)} />
          <InfoRow label="Minuty" value={String(stat.minutesPlayed)} />
        </CardContent>
      )}
    </Card>
  );
}

function HistoryTab({
  playerId,
  history,
  canManage,
}: {
  playerId: string;
  history: PlayerDetailData["history"];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    addPlayerHistoryEntry.bind(null, playerId),
    initialState,
  );

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dodaj wpis historii</CardTitle>
          </CardHeader>
          <form action={action} className="grid gap-4 px-6 pb-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="eventType">Typ zdarzenia</Label>
              <select id="eventType" name="eventType" className={selectClassName} required>
                {Object.entries(PLAYER_HISTORY_EVENT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventDate">Data</Label>
              <Input id="eventDate" name="eventDate" type="date" required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="relatedClubName">Poprzedni / powiązany klub</Label>
              <Input id="relatedClubName" name="relatedClubName" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Opis</Label>
              <Input id="description" name="description" />
            </div>
            {state.success ? (
              <p className="text-sm text-primary md:col-span-2">{state.success}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="md:col-span-2">
              Dodaj wpis
            </Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardContent className="divide-y p-0">
          {history.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Brak historii.</p>
          ) : (
            history.map((entry) => (
              <div key={entry.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">
                    {PLAYER_HISTORY_EVENT_LABELS[entry.eventType]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{entry.eventDate}</span>
                </div>
                {entry.description ? (
                  <p className="mt-2 text-sm">{entry.description}</p>
                ) : null}
                {entry.relatedClubName ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Klub: {entry.relatedClubName}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InjuriesTab({
  playerId,
  injuries,
  canManage,
}: {
  playerId: string;
  injuries: PlayerDetailData["injuries"];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(
    addPlayerInjury.bind(null, playerId),
    initialState,
  );

  return (
    <div className="space-y-4">
      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dodaj kontuzję</CardTitle>
          </CardHeader>
          <form action={action} className="grid gap-4 px-6 pb-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="injuryDate">Data kontuzji</Label>
              <Input id="injuryDate" name="injuryDate" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="recoveryDate">Data powrotu</Label>
              <Input id="recoveryDate" name="recoveryDate" type="date" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Opis</Label>
              <Input id="description" name="description" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="severity">Nasilenie</Label>
              <Input id="severity" name="severity" placeholder="np. łagodna" />
            </div>
            <label className="flex items-center gap-2 text-sm md:mt-8">
              <input type="checkbox" name="isActive" defaultChecked />
              Kontuzja aktywna
            </label>
            {state.success ? (
              <p className="text-sm text-primary md:col-span-2">{state.success}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="md:col-span-2">
              Zapisz kontuzję
            </Button>
          </form>
        </Card>
      ) : null}

      <Card>
        <CardContent className="divide-y p-0">
          {injuries.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Brak kontuzji.</p>
          ) : (
            injuries.map((injury) => (
              <div key={injury.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={injury.isActive ? "destructive" : "secondary"}>
                    {injury.isActive ? "Aktywna" : "Zakończona"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {injury.injuryDate}
                    {injury.recoveryDate ? ` → ${injury.recoveryDate}` : ""}
                  </span>
                </div>
                <p className="mt-2 text-sm">{injury.description}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NotesTab({
  playerId,
  notes,
}: {
  playerId: string;
  notes: PlayerDetailData["notes"];
}) {
  const [state, action, pending] = useActionState(
    addCoachNote.bind(null, playerId),
    initialState,
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Nowa notatka</CardTitle>
          <CardDescription>Widoczna tylko dla sztabu szkoleniowego.</CardDescription>
        </CardHeader>
        <form action={action} className="space-y-4 px-6 pb-6">
          <div className="space-y-2">
            <Label htmlFor="noteType">Typ</Label>
            <select id="noteType" name="noteType" className={selectClassName}>
              {Object.entries(COACH_NOTE_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Treść</Label>
            <textarea
              id="content"
              name="content"
              required
              rows={4}
              className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-xs"
            />
          </div>
          {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-primary">{state.success}</p> : null}
          <Button type="submit" disabled={pending}>
            Dodaj notatkę
          </Button>
        </form>
      </Card>

      <Card>
        <CardContent className="divide-y p-0">
          {notes.length === 0 ? (
            <p className="px-6 py-8 text-sm text-muted-foreground">Brak notatek.</p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="px-6 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{COACH_NOTE_TYPE_LABELS[note.noteType]}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {note.authorName ?? "Trener"} ·{" "}
                    {new Date(note.createdAt).toLocaleDateString("pl-PL")}
                  </span>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue: number;
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type="number" min={0} defaultValue={defaultValue} />
    </div>
  );
}
