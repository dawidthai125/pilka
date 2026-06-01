"use client";

import { useActionState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatsGrid } from "@/components/ui/stats-grid";
import {
  importLeagueFileAction,
  resolveLeagueConflictAction,
  runLeagueSyncAction,
  upsertLeaguePlayerAction,
  upsertLeagueSourceAction,
  upsertLeagueTeamAction,
  type LeagueActionState,
} from "@/features/league/actions";
import {
  DZPN_LEAGUE_NOTE,
  EXTRANET_LEAGUE_NOTE,
  LEAGUE_IMPORT_TYPE_LABELS,
  LEAGUE_SOURCE_ADAPTER_LABELS,
  LEAGUE_SYNC_STATUS_LABELS,
  PZPN_LEAGUE_NOTE,
} from "@/lib/league/constants";
import type {
  LeagueCompetition,
  LeagueConflict,
  LeagueDashboardStats,
  LeagueMatch,
  LeaguePlayerRegistryEntry,
  LeagueSeason,
  LeagueSource,
  LeagueSyncJob,
  LeagueSyncLog,
  LeagueTableRow,
  LeagueTeam,
} from "@/types/league";
import type { Team } from "@/types/rbac";

const initial: LeagueActionState = {};

export function LeagueDashboardStatsCards({ stats }: { stats: LeagueDashboardStats }) {
  return (
    <StatsGrid
      items={[
        { label: "Oczekujące sync", value: stats.pendingSync },
        { label: "Konflikty", value: stats.pendingConflicts },
        { label: "Rozegrane mecze", value: stats.completedMatches },
        { label: "Nadchodzące", value: stats.upcomingMatches },
        {
          label: "Pozycja / pkt",
          value:
            stats.ownTeamPosition != null
              ? `${stats.ownTeamPosition}. (${stats.ownTeamPoints ?? 0} pkt)`
              : "—",
        },
      ]}
    />
  );
}

export function LeagueTableView({ rows }: { rows: LeagueTableRow[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">Brak danych tabeli — zaimportuj tabelę ligową.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted/50">
          <tr>
            {["#", "Drużyna", "M", "W", "R", "P", "BZ", "BS", "RB", "Pkt"].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.isOwnClub ? "bg-primary/5 font-medium" : ""}>
              <td className="px-3 py-2">{row.position}</td>
              <td className="px-3 py-2">{row.teamName}</td>
              <td className="px-3 py-2">{row.played}</td>
              <td className="px-3 py-2">{row.won}</td>
              <td className="px-3 py-2">{row.drawn}</td>
              <td className="px-3 py-2">{row.lost}</td>
              <td className="px-3 py-2">{row.goalsFor}</td>
              <td className="px-3 py-2">{row.goalsAgainst}</td>
              <td className="px-3 py-2">{row.goalDifference}</td>
              <td className="px-3 py-2">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LeagueFixturesList({
  title,
  matches,
}: {
  title: string;
  matches: LeagueMatch[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!matches.length ? (
          <p className="text-sm text-muted-foreground">Brak meczów.</p>
        ) : (
          matches.map((m) => (
            <div
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <span>
                {m.matchDate} · {m.homeTeamName}
                {m.homeScore != null ? ` ${m.homeScore}:${m.awayScore} ` : " — "}
                {m.awayTeamName}
              </span>
              <Badge variant="secondary">{m.syncStatus}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

export function LeagueImportForm({
  canSync,
  seasons,
  competitions,
  sources,
}: {
  canSync: boolean;
  seasons: LeagueSeason[];
  competitions: LeagueCompetition[];
  sources: LeagueSource[];
}) {
  const [state, action, pending] = useActionState(importLeagueFileAction, initial);
  const activeSeason = seasons.find((s) => s.isActive) ?? seasons[0];
  const filtered = competitions.filter((c) => !activeSeason || c.seasonId === activeSeason.id);

  if (!canSync) {
    return <p className="text-sm text-muted-foreground">Import dostępny dla właściciela, prezesa i dyrektora sportowego.</p>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import ręczny (CSV / JSON / XLSX)</CardTitle>
        <CardDescription>{DZPN_LEAGUE_NOTE}</CardDescription>
      </CardHeader>
      <CardContent>
        {state.error ? <p className="mb-3 text-sm text-destructive">{state.error}</p> : null}
        {state.success ? <p className="mb-3 text-sm text-green-700">{state.success}</p> : null}
        <form action={action} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            Sezon
            <select name="seasonId" className="w-full min-h-[44px] rounded-md border px-2" defaultValue={activeSeason?.id}>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Rozgrywki
            <select name="competitionId" className="w-full min-h-[44px] rounded-md border px-2" required>
              {filtered.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Typ importu
            <select name="importType" className="w-full min-h-[44px] rounded-md border px-2" defaultValue="full">
              {Object.entries(LEAGUE_IMPORT_TYPE_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            Adapter
            <select name="adapter" className="w-full min-h-[44px] rounded-md border px-2" defaultValue="csv">
              {Object.entries(LEAGUE_SOURCE_ADAPTER_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            Źródło (opcjonalnie)
            <select name="sourceId" className="w-full min-h-[44px] rounded-md border px-2" defaultValue="">
              <option value="">—</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            Plik
            <input type="file" name="file" accept=".csv,.json,.xlsx,.txt" required className="w-full text-sm" />
          </label>
          <Button type="submit" disabled={pending} className="min-h-[44px] sm:col-span-2">
            {pending ? "Importowanie…" : "Importuj i synchronizuj"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function LeagueSyncCenter({
  canSync,
  jobs,
  logs,
  competitions,
  conflicts,
}: {
  canSync: boolean;
  jobs: LeagueSyncJob[];
  logs: LeagueSyncLog[];
  competitions: LeagueCompetition[];
  conflicts: LeagueConflict[];
}) {
  const [syncState, syncAction, syncPending] = useActionState(runLeagueSyncAction, initial);
  const [resolveState, resolveAction, resolvePending] = useActionState(resolveLeagueConflictAction, initial);
  const defaultCompetition = competitions[0]?.id ?? "";

  return (
    <div className="space-y-6">
      {(syncState.error || syncState.success || resolveState.error || resolveState.success) && (
        <div className="space-y-1 text-sm">
          {syncState.error ? <p className="text-destructive">{syncState.error}</p> : null}
          {syncState.success ? <p className="text-green-700">{syncState.success}</p> : null}
          {resolveState.error ? <p className="text-destructive">{resolveState.error}</p> : null}
          {resolveState.success ? <p className="text-green-700">{resolveState.success}</p> : null}
        </div>
      )}

      {canSync ? (
        <Card>
          <CardHeader>
            <CardTitle>Synchronizacja z modułem Mecze</CardTitle>
            <CardDescription>Bez duplikacji — powiązanie przez match_id.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={syncAction} className="flex flex-wrap gap-2">
              <select name="competitionId" className="min-h-[44px] rounded-md border px-2 text-sm" defaultValue={defaultCompetition}>
                {competitions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <Button type="submit" disabled={syncPending} className="min-h-[44px]">
                Uruchom sync
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {conflicts.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Konflikty ({conflicts.length})</CardTitle>
            <CardDescription>Wybierz źródło prawdy dla wyniku.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {conflicts.map((c) => (
              <div key={c.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">
                  {c.matchDate} · {c.homeTeamName} — {c.awayTeamName}
                </p>
                <p className="text-muted-foreground">
                  Lokalnie: {c.localValue ?? "—"} · Import: {c.externalValue ?? "—"}
                </p>
                {canSync ? (
                  <div className="mt-2 flex flex-wrap gap-2">
                    <form action={resolveAction}>
                      <input type="hidden" name="conflictId" value={c.id} />
                      <input type="hidden" name="resolution" value="keep_local" />
                      <Button type="submit" size="sm" variant="outline" disabled={resolvePending}>
                        Zachowaj lokalne
                      </Button>
                    </form>
                    <form action={resolveAction}>
                      <input type="hidden" name="conflictId" value={c.id} />
                      <input type="hidden" name="resolution" value="keep_external" />
                      <Button type="submit" size="sm" disabled={resolvePending}>
                        Przyjmij import
                      </Button>
                    </form>
                  </div>
                ) : null}
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Historia zadań</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {jobs.map((job) => (
            <div key={job.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span>{job.createdAt.slice(0, 16)} · {LEAGUE_IMPORT_TYPE_LABELS[job.importType]}</span>
              <Badge>{LEAGUE_SYNC_STATUS_LABELS[job.status] ?? job.status}</Badge>
              <span className="text-muted-foreground">
                OK: {job.recordsProcessed} · błędy: {job.recordsFailed} · konflikty: {job.recordsConflicts}
              </span>
            </div>
          ))}
          {!jobs.length ? <p className="text-sm text-muted-foreground">Brak zadań synchronizacji.</p> : null}
        </CardContent>
      </Card>

      {logs.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Logi (ostatnie zadanie)</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-1 overflow-y-auto text-xs font-mono">
            {logs.map((log) => (
              <p key={log.id}>
                [{log.level}] {log.message}
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function LeagueTeamsPanel({
  canManage,
  teams,
  competitions,
  clubTeams,
}: {
  canManage: boolean;
  teams: LeagueTeam[];
  competitions: LeagueCompetition[];
  clubTeams: Team[];
}) {
  const [state, action, pending] = useActionState(upsertLeagueTeamAction, initial);
  const competitionId = competitions[0]?.id ?? "";

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Mapowanie drużyn</CardTitle>
          <CardDescription>np. Piorun Wawrzeńczyce ↔ GLKS Mietków w rozgrywkach.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {teams.map((t) => (
            <div key={t.id} className="rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">{t.displayName}</span>
              <span className="text-muted-foreground"> → ligowo: {t.leagueName}</span>
              {t.isOwnClub ? <Badge className="ml-2">Własny klub</Badge> : null}
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Dodaj / edytuj mapowanie</CardTitle>
          </CardHeader>
          <CardContent>
            {state.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="mb-2 text-sm text-green-700">{state.success}</p> : null}
            <form action={action} className="grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="competitionId" value={competitionId} />
              <label className="space-y-1 text-sm">
                Nazwa w FC OS
                <input name="displayName" required className="w-full min-h-[44px] rounded-md border px-2" placeholder="Piorun Wawrzeńczyce" />
              </label>
              <label className="space-y-1 text-sm">
                Nazwa ligowa
                <input name="leagueName" required className="w-full min-h-[44px] rounded-md border px-2" placeholder="GLKS Mietków" />
              </label>
              <label className="space-y-1 text-sm">
                Drużyna FC OS
                <select name="teamId" className="w-full min-h-[44px] rounded-md border px-2">
                  <option value="">—</option>
                  {clubTeams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" name="isOwnClub" />
                Własny klub w rozgrywkach
              </label>
              <Button type="submit" disabled={pending} className="min-h-[44px] sm:col-span-2">Zapisz</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function LeaguePlayersPanel({
  canManage,
  entries,
  competitions,
  seasons,
}: {
  canManage: boolean;
  entries: LeaguePlayerRegistryEntry[];
  competitions: LeagueCompetition[];
  seasons: LeagueSeason[];
}) {
  const [state, action, pending] = useActionState(upsertLeaguePlayerAction, initial);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Rejestr zawodników ligowych</CardTitle>
          <CardDescription>Powiązanie Football Club OS ↔ dane rozgrywkowe.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="rounded-md border px-3 py-2 text-sm">
              <span className="font-medium">{e.leaguePlayerName}</span>
              {e.playerName ? (
                <span className="text-muted-foreground"> ↔ {e.playerName}</span>
              ) : (
                <span className="text-muted-foreground"> (niepowiązany)</span>
              )}
            </div>
          ))}
          {!entries.length ? <p className="text-sm text-muted-foreground">Brak wpisów.</p> : null}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nowe powiązanie</CardTitle>
          </CardHeader>
          <CardContent>
            {state.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="mb-2 text-sm text-green-700">{state.success}</p> : null}
            <form action={action} className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                Nazwa ligowa
                <input name="leaguePlayerName" required className="w-full min-h-[44px] rounded-md border px-2" />
              </label>
              <label className="space-y-1 text-sm">
                Drużyna ligowa
                <input name="leagueTeamName" className="w-full min-h-[44px] rounded-md border px-2" />
              </label>
              <label className="space-y-1 text-sm">
                ID zawodnika FC OS (UUID)
                <input name="playerId" className="w-full min-h-[44px] rounded-md border px-2" />
              </label>
              <input type="hidden" name="competitionId" value={competitions[0]?.id ?? ""} />
              <input type="hidden" name="seasonId" value={seasons.find((s) => s.isActive)?.id ?? ""} />
              <Button type="submit" disabled={pending} className="min-h-[44px] sm:col-span-2">Zapisz</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

export function LeagueSourcesPanel({
  canManage,
  sources,
  competitions,
}: {
  canManage: boolean;
  sources: LeagueSource[];
  competitions: LeagueCompetition[];
}) {
  const [state, action, pending] = useActionState(upsertLeagueSourceAction, initial);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">PZPN</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{PZPN_LEAGUE_NOTE}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">DZPN</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{DZPN_LEAGUE_NOTE}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Extranet</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{EXTRANET_LEAGUE_NOTE}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skonfigurowane źródła</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {sources.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span>{s.name}</span>
              <Badge variant="secondary">{LEAGUE_SOURCE_ADAPTER_LABELS[s.adapter]}</Badge>
              <span className="text-muted-foreground">{s.providerLabel ?? "—"}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {canManage ? (
        <Card>
          <CardHeader>
            <CardTitle>Nowe źródło</CardTitle>
          </CardHeader>
          <CardContent>
            {state.error ? <p className="mb-2 text-sm text-destructive">{state.error}</p> : null}
            {state.success ? <p className="mb-2 text-sm text-green-700">{state.success}</p> : null}
            <form action={action} className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                Nazwa
                <input name="name" required className="w-full min-h-[44px] rounded-md border px-2" />
              </label>
              <label className="space-y-1 text-sm">
                Adapter
                <select name="adapter" className="w-full min-h-[44px] rounded-md border px-2" defaultValue="csv">
                  {Object.entries(LEAGUE_SOURCE_ADAPTER_LABELS).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                Provider
                <input name="providerLabel" className="w-full min-h-[44px] rounded-md border px-2" placeholder="DZPN / PZPN" />
              </label>
              <label className="space-y-1 text-sm sm:col-span-2">
                Rozgrywki
                <select name="competitionId" className="w-full min-h-[44px] rounded-md border px-2">
                  <option value="">—</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <Button type="submit" disabled={pending} className="min-h-[44px] sm:col-span-2">Zapisz źródło</Button>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
