"use client";

import { useActionState } from "react";

import { upsertLeagueTableEntry, type MatchActionState } from "@/features/matches/actions";
import type { LeagueTableEntry } from "@/types/matches";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const initialState: MatchActionState = {};

export function LeagueTableView({
  entries,
  competition,
  season,
  canManage,
}: {
  entries: LeagueTableEntry[];
  competition: string;
  season: string;
  canManage: boolean;
}) {
  const action = upsertLeagueTableEntry;
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="space-y-6">
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <th className="px-3 py-3">#</th>
              <th className="px-3 py-3">Drużyna</th>
              <th className="px-3 py-3">M</th>
              <th className="px-3 py-3">Z</th>
              <th className="px-3 py-3">R</th>
              <th className="px-3 py-3">P</th>
              <th className="px-3 py-3">B+</th>
              <th className="px-3 py-3">B-</th>
              <th className="px-3 py-3">RB</th>
              <th className="px-3 py-3">Pkt</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} className={cn("border-b", entry.isOwnClub && "bg-primary/5 font-medium")}>
                <td className="px-3 py-2">{index + 1}</td>
                <td className="px-3 py-2">{entry.teamName}</td>
                <td className="px-3 py-2">{entry.played}</td>
                <td className="px-3 py-2">{entry.won}</td>
                <td className="px-3 py-2">{entry.drawn}</td>
                <td className="px-3 py-2">{entry.lost}</td>
                <td className="px-3 py-2">{entry.goalsFor}</td>
                <td className="px-3 py-2">{entry.goalsAgainst}</td>
                <td className="px-3 py-2">{entry.goalDifference}</td>
                <td className="px-3 py-2 font-semibold">{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {canManage ? (
        <Card>
          <CardHeader><CardTitle>Edycja wpisu (tabela ręczna)</CardTitle></CardHeader>
          <CardContent>
            <form action={formAction} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {state.error ? <p className="sm:col-span-full text-sm text-destructive">{state.error}</p> : null}
              {state.success ? <p className="sm:col-span-full text-sm text-primary">{state.success}</p> : null}
              <input type="hidden" name="competition" value={competition} />
              <input type="hidden" name="season" value={season} />
              <div className="space-y-1 sm:col-span-2"><Label>Nazwa drużyny</Label><Input name="teamName" required /></div>
              <div className="space-y-1"><Label>Mecze</Label><Input name="played" type="number" defaultValue={0} /></div>
              <div className="space-y-1"><Label>Zwycięstwa</Label><Input name="won" type="number" defaultValue={0} /></div>
              <div className="space-y-1"><Label>Remisy</Label><Input name="drawn" type="number" defaultValue={0} /></div>
              <div className="space-y-1"><Label>Porażki</Label><Input name="lost" type="number" defaultValue={0} /></div>
              <div className="space-y-1"><Label>Gole +</Label><Input name="goalsFor" type="number" defaultValue={0} /></div>
              <div className="space-y-1"><Label>Gole -</Label><Input name="goalsAgainst" type="number" defaultValue={0} /></div>
              <div className="space-y-1"><Label>Punkty</Label><Input name="points" type="number" defaultValue={0} /></div>
              <label className="flex items-center gap-2 text-sm sm:col-span-full">
                <input type="checkbox" name="isOwnClub" /> Nasz klub
              </label>
              <Button type="submit" disabled={pending}>Dodaj / zaktualizuj</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
