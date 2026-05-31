"use client";

import { useActionState, useState } from "react";

import {
  addMatchEvent,
  saveLineupPosition,
  saveMatchFormation,
  setMatchMvp,
  setMatchSquadRole,
  type MatchActionState,
} from "@/features/matches/actions";
import { MatchStatusBadge } from "@/features/matches/components/match-status-badge";
import {
  FORMATION_PRESETS,
  MATCH_EVENT_TYPE_LABELS,
  MATCH_SQUAD_ROLE_LABELS,
} from "@/lib/matches/constants";
import type { MatchDetailData } from "@/types/matches";
import type { FormationCode } from "@/types/matches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const initialState: MatchActionState = {};
const selectClassName = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function MatchDetailView({
  data,
  roster,
  canManage,
}: {
  data: MatchDetailData;
  roster: Array<{ id: string; firstName: string; lastName: string }>;
  canManage: boolean;
}) {
  const { match } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{match.homeTeamName} — {match.awayTeamName}</h1>
            <MatchStatusBadge status={match.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {match.matchDate} · {match.matchTime} · {match.competition} · Sezon {match.season}
            {match.roundNumber ? ` · Kolejka ${match.roundNumber}` : ""}
          </p>
          {match.homeScore !== null ? (
            <p className="mt-2 text-3xl font-bold">{match.homeScore} : {match.awayScore}</p>
          ) : null}
          {match.mvpPlayerName ? <p className="mt-1 text-sm">MVP: {match.mvpPlayerName}</p> : null}
        </div>
      </div>

      <SquadPanel data={data} roster={roster} canManage={canManage} />
      <FormationPanel data={data} roster={roster} canManage={canManage} />
      <EventsPanel data={data} roster={roster} canManage={canManage} />
      <StatsPanel data={data} />
      {canManage ? <MvpPanel matchId={match.id} roster={roster} currentMvpId={match.mvpPlayerId} /> : null}
    </div>
  );
}

function SquadPanel({
  data,
  roster,
  canManage,
}: {
  data: MatchDetailData;
  roster: Array<{ id: string; firstName: string; lastName: string }>;
  canManage: boolean;
}) {
  const squadMap = new Map(data.squad.map((s) => [s.playerId, s]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kadra meczowa</CardTitle>
        <CardDescription>Frekwencja treningowa, kontuzje, zawieszenia i ostatnia aktywność.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="py-2">Zawodnik</th>
              <th className="py-2">Status</th>
              <th className="py-2">Frekwencja</th>
              <th className="py-2">Ostatnia aktywność</th>
              <th className="py-2">Rola</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((player) => {
              const entry = squadMap.get(player.id);
              return (
                <tr key={player.id} className="border-b">
                  <td className="py-2 font-medium">{player.firstName} {player.lastName}</td>
                  <td className="py-2"><Badge variant="secondary">{entry?.playerStatus ?? "active"}</Badge></td>
                  <td className="py-2">{entry?.attendanceRate ?? 0}%</td>
                  <td className="py-2">{entry?.lastActivity ? new Date(entry.lastActivity).toLocaleDateString("pl-PL") : "—"}</td>
                  <td className="py-2">
                    {canManage ? (
                      <SquadRoleForm matchId={data.match.id} playerId={player.id} current={entry?.squadRole ?? "squad"} />
                    ) : (
                      entry ? MATCH_SQUAD_ROLE_LABELS[entry.squadRole] : "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function SquadRoleForm({ matchId, playerId, current }: { matchId: string; playerId: string; current: string }) {
  const action = setMatchSquadRole.bind(null, matchId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex gap-1">
      <input type="hidden" name="playerId" value={playerId} />
      <select name="squadRole" defaultValue={current} className={selectClassName}>
        {Object.entries(MATCH_SQUAD_ROLE_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>OK</Button>
      {state.error ? <span className="text-xs text-destructive">{state.error}</span> : null}
    </form>
  );
}

function FormationPanel({
  data,
  roster,
  canManage,
}: {
  data: MatchDetailData;
  roster: Array<{ id: string; firstName: string; lastName: string }>;
  canManage: boolean;
}) {
  const formation = (data.match.formation ?? "4-4-2") as FormationCode;
  const slots = FORMATION_PRESETS[formation] ?? FORMATION_PRESETS["4-4-2"];
  const lineupMap = new Map(data.lineup.map((l) => [l.playerId, l]));
  const [dragPlayer, setDragPlayer] = useState<string | null>(null);
  const saveAction = saveLineupPosition.bind(null, data.match.id);
  const [saveState, saveFormAction] = useActionState(saveAction, initialState);
  const formationAction = saveMatchFormation.bind(null, data.match.id);
  const [formState, formAction, formPending] = useActionState(formationAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ustawienie taktyczne</CardTitle>
        <CardDescription>Przeciągnij zawodnika na pozycję na boisku.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <form action={formAction} className="flex flex-wrap gap-2">
            <select name="formation" defaultValue={formation} className={selectClassName}>
              {Object.keys(FORMATION_PRESETS).map((f) => (<option key={f} value={f}>{f}</option>))}
            </select>
            <Button type="submit" size="sm" disabled={formPending}>Zmień formację</Button>
            {formState.success ? <span className="text-sm">{formState.success}</span> : null}
          </form>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {roster.map((p) => (
            <button
              key={p.id}
              type="button"
              draggable={canManage}
              onDragStart={() => setDragPlayer(p.id)}
              className="rounded-md border bg-card px-2 py-1 text-xs cursor-grab active:cursor-grabbing"
            >
              {p.firstName[0]}. {p.lastName}
            </button>
          ))}
        </div>

        <div className="relative mx-auto aspect-[2/3] max-w-md rounded-lg border-2 border-emerald-700/40 bg-emerald-900/20">
          <div className="absolute inset-x-0 top-1/2 border-t border-emerald-700/30" />
          {slots.map((slot) => {
            const assigned = [...lineupMap.values()].find((l) => l.slotCode === slot.slotCode);
            return (
              <div
                key={slot.slotCode}
                onDragOver={(e) => canManage && e.preventDefault()}
                onDrop={() => {
                  if (!dragPlayer || !canManage) return;
                  const fd = new FormData();
                  fd.set("playerId", dragPlayer);
                  fd.set("slotCode", slot.slotCode);
                  fd.set("posX", String(slot.posX));
                  fd.set("posY", String(slot.posY));
                  saveFormAction(fd);
                }}
                className="absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border bg-background text-[10px] font-medium"
                style={{ left: `${slot.posX}%`, top: `${slot.posY}%` }}
              >
                {assigned?.playerName?.split(" ").pop()?.slice(0, 6) ?? slot.slotCode}
              </div>
            );
          })}
        </div>
        {saveState.error ? <p className="text-sm text-destructive">{saveState.error}</p> : null}
      </CardContent>
    </Card>
  );
}

function EventsPanel({
  data,
  roster,
  canManage,
}: {
  data: MatchDetailData;
  roster: Array<{ id: string; firstName: string; lastName: string }>;
  canManage: boolean;
}) {
  const action = addMatchEvent.bind(null, data.match.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader><CardTitle>Wydarzenia meczowe</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {data.events.length === 0 ? <li className="text-sm text-muted-foreground">Brak zdarzeń.</li> : null}
          {data.events.map((ev) => (
            <li key={ev.id} className="rounded-md border px-3 py-2 text-sm">
              <strong>{ev.minute}&apos;</strong> {MATCH_EVENT_TYPE_LABELS[ev.eventType]}
              {ev.playerName ? ` — ${ev.playerName}` : ""}
              {ev.relatedPlayerName ? ` (${ev.relatedPlayerName})` : ""}
              {ev.notes ? ` · ${ev.notes}` : ""}
            </li>
          ))}
        </ul>
        {canManage ? (
          <form action={formAction} className="grid gap-3 sm:grid-cols-2">
            {state.error ? <p className="sm:col-span-2 text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="sm:col-span-2 text-sm text-primary">{state.success}</p> : null}
            <div className="space-y-1">
              <Label>Typ</Label>
              <select name="eventType" className={selectClassName}>
                {Object.entries(MATCH_EVENT_TYPE_LABELS).map(([v, l]) => (<option key={v} value={v}>{l}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Minuta</Label>
              <Input name="minute" type="number" min={0} max={130} required />
            </div>
            <div className="space-y-1">
              <Label>Zawodnik</Label>
              <select name="playerId" className={selectClassName}>
                <option value="">—</option>
                {roster.map((p) => (<option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Powiązany</Label>
              <select name="relatedPlayerId" className={selectClassName}>
                <option value="">—</option>
                {roster.map((p) => (<option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>))}
              </select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Uwagi</Label>
              <Input name="notes" />
            </div>
            <Button type="submit" disabled={pending}>Dodaj zdarzenie</Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StatsPanel({ data }: { data: MatchDetailData }) {
  return (
    <Card>
      <CardHeader><CardTitle>Statystyki meczowe</CardTitle></CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="py-2 text-left">Zawodnik</th>
              <th className="py-2">Min</th>
              <th className="py-2">G</th>
              <th className="py-2">A</th>
              <th className="py-2">ŻK</th>
              <th className="py-2">CK</th>
            </tr>
          </thead>
          <tbody>
            {data.playerStats.map((s) => (
              <tr key={s.playerId} className="border-b">
                <td className="py-2">{s.playerName}</td>
                <td className="py-2 text-center">{s.minutesPlayed}</td>
                <td className="py-2 text-center">{s.goals}</td>
                <td className="py-2 text-center">{s.assists}</td>
                <td className="py-2 text-center">{s.yellowCards}</td>
                <td className="py-2 text-center">{s.redCards}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function MvpPanel({
  matchId,
  roster,
  currentMvpId,
}: {
  matchId: string;
  roster: Array<{ id: string; firstName: string; lastName: string }>;
  currentMvpId: string | null;
}) {
  const action = setMatchMvp.bind(null, matchId);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <Card>
      <CardHeader><CardTitle>MVP meczu</CardTitle></CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-wrap gap-2">
          <select name="playerId" defaultValue={currentMvpId ?? ""} className={selectClassName}>
            <option value="">Wybierz MVP</option>
            {roster.map((p) => (<option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>))}
          </select>
          <Button type="submit" disabled={pending}>Zapisz MVP</Button>
          {state.error ? <span className="text-sm text-destructive">{state.error}</span> : null}
          {state.success ? <span className="text-sm">{state.success}</span> : null}
        </form>
      </CardContent>
    </Card>
  );
}
