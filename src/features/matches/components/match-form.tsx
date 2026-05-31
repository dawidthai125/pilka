"use client";

import { useActionState } from "react";

import { createMatch, updateMatch, type MatchActionState } from "@/features/matches/actions";
import { DEFAULT_COMPETITION, DEFAULT_SEASON, MATCH_STATUS_LABELS } from "@/lib/matches/constants";
import type { Match } from "@/types/matches";
import type { Team } from "@/types/rbac";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const initialState: MatchActionState = {};
const selectClassName = "border-input bg-background h-9 w-full rounded-md border px-3 text-sm shadow-xs";

export function MatchForm({
  teams,
  match,
  ownTeamName,
  mode,
}: {
  teams: Team[];
  match?: Match;
  ownTeamName: string;
  mode: "create" | "edit";
}) {
  const action = mode === "create" ? createMatch : updateMatch.bind(null, match!.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction}>
      <div className="space-y-6">
        {state.error ? <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="rounded-md bg-primary/10 px-3 py-2 text-sm">{state.success}</p> : null}

        <Card>
          <CardHeader><CardTitle>Dane meczu</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="teamId">Drużyna</Label>
              <select id="teamId" name="teamId" defaultValue={match?.teamId ?? teams[0]?.id} className={selectClassName} required>
                {teams.map((team) => (<option key={team.id} value={team.id}>{team.name}</option>))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" defaultValue={match?.status ?? "planned"} className={selectClassName}>
                {Object.entries(MATCH_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="competition">Rozgrywki</Label>
              <Input id="competition" name="competition" defaultValue={match?.competition ?? DEFAULT_COMPETITION} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="season">Sezon</Label>
              <Input id="season" name="season" defaultValue={match?.season ?? DEFAULT_SEASON} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roundNumber">Kolejka</Label>
              <Input id="roundNumber" name="roundNumber" type="number" defaultValue={match?.roundNumber ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchDate">Data</Label>
              <Input id="matchDate" name="matchDate" type="date" defaultValue={match?.matchDate} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="matchTime">Godzina</Label>
              <Input id="matchTime" name="matchTime" type="time" defaultValue={match?.matchTime ?? "16:00"} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="homeTeamName">Gospodarz</Label>
              <Input id="homeTeamName" name="homeTeamName" defaultValue={match?.homeTeamName ?? ownTeamName} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeamName">Gość</Label>
              <Input id="awayTeamName" name="awayTeamName" defaultValue={match?.awayTeamName ?? ""} required />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="stadium">Stadion</Label>
              <Input id="stadium" name="stadium" defaultValue={match?.stadium ?? ""} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="stadiumAddress">Adres stadionu</Label>
              <Input id="stadiumAddress" name="stadiumAddress" defaultValue={match?.stadiumAddress ?? ""} />
            </div>
            {mode === "edit" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="homeScore">Gole gospodarzy</Label>
                  <Input id="homeScore" name="homeScore" type="number" defaultValue={match?.homeScore ?? ""} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="awayScore">Gole gości</Label>
                  <Input id="awayScore" name="awayScore" type="number" defaultValue={match?.awayScore ?? ""} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="coachNotes">Notatki trenera</Label>
                  <textarea id="coachNotes" name="coachNotes" rows={3} defaultValue={match?.coachNotes ?? ""} className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm shadow-xs" />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>
        <Button type="submit" disabled={pending}>{pending ? "Zapisywanie..." : mode === "create" ? "Utwórz mecz" : "Zapisz"}</Button>
      </div>
    </form>
  );
}
