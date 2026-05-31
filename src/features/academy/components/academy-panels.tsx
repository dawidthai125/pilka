"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  addFitnessTestAction,
  addPlayerAssessmentAction,
  addScoutingReportAction,
  addTeamTransitionAction,
  upsertOpponentAnalysisAction,
  upsertPlayerDevelopmentAction,
  upsertPlayerGoalAction,
  upsertScoutingClubAction,
  upsertScoutingPlayerAction,
  type AcademyActionState,
} from "@/features/academy/actions";
import {
  ACADEMY_AGE_GROUP_LABELS,
  ACADEMY_AI_PROMPTS,
  ASSESSMENT_CATEGORY_LABELS,
  DEVELOPMENT_CHART_RANGE_LABELS,
  FITNESS_TEST_TYPE_LABELS,
  PLAYER_GOAL_STATUS_LABELS,
  SCOUTING_CLUB_TYPE_LABELS,
  SCOUTING_PLAYER_STATUS_LABELS,
  TEAM_TRANSITION_TYPE_LABELS,
} from "@/lib/academy/constants";
import { filterByChartRange } from "@/lib/academy/mappers";
import { FITNESS_TEST_TYPES, type DevelopmentChartRange } from "@/types/academy";
import type {
  AcademyDashboardStats,
  AcademyGroup,
  OpponentAnalysis,
  PlayerDevelopmentDetail,
  ScoutingClub,
  ScoutingPlayer,
  ScoutingReport,
  TalentRankingEntry,
} from "@/types/academy";
import type { Player } from "@/types/players";

const initial: AcademyActionState = {};
const selectClass = "min-h-[44px] w-full rounded-md border px-3 text-sm";

export function AcademyStatsCards({ stats }: { stats: AcademyDashboardStats }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {[
        { label: "Grupy akademii", value: stats.groupCount },
        { label: "Profile rozwoju", value: stats.assessedPlayers },
        { label: "Aktywne cele", value: stats.activeGoals },
        { label: "Obserwowani", value: stats.scoutingProspects },
        { label: "Rekomendacje", value: stats.pendingRecommendations },
      ].map((item) => (
        <Card key={item.label}>
          <CardHeader className="pb-2">
            <CardDescription>{item.label}</CardDescription>
            <CardTitle className="text-2xl">{item.value}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function AcademyAiPrompts({ category }: { category: "development" | "scouting" }) {
  const prompts = ACADEMY_AI_PROMPTS[category];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sugestie AI</CardTitle>
        <CardDescription>Użyj w Club AI Assistant (/ai/chat)</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {prompts.map((p) => (
          <Link key={p} href={`/ai/chat?q=${encodeURIComponent(p)}`} className="rounded-full border px-3 py-1.5 text-sm hover:bg-muted">
            {p}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

export function AcademyGroupsPanel({ groups }: { groups: AcademyGroup[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((g) => (
        <Card key={g.id}>
          <CardHeader>
            <CardTitle>{ACADEMY_AGE_GROUP_LABELS[g.ageGroup]}</CardTitle>
            <CardDescription>{g.description ?? g.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>Drużyna: {g.teamName ?? "—"}</p>
            <p>Zawodnicy: {g.playerCount ?? 0}</p>
            <Badge variant={g.isActive ? "default" : "secondary"}>{g.isActive ? "Aktywna" : "Nieaktywna"}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function DevelopmentPlayersList({ players }: { players: Player[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {players.map((p) => (
          <Link key={p.id} href={`/academy/development/${p.id}`} className="block rounded-xl border p-4 text-sm hover:bg-muted/30">
            <p className="font-medium">{p.firstName} {p.lastName}</p>
            <p className="text-muted-foreground">#{p.jerseyNumber ?? "—"} · {p.primaryPosition}</p>
          </Link>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">Zawodnik</th>
              <th className="px-4 py-3">Pozycja</th>
              <th className="px-4 py-3">Nr</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="px-4 py-3">{p.firstName} {p.lastName}</td>
                <td className="px-4 py-3">{p.primaryPosition}</td>
                <td className="px-4 py-3">{p.jerseyNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  <Link href={`/academy/development/${p.id}`} className="text-primary underline">Profil rozwoju</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SimpleLineChart({
  points,
  label,
  max = 100,
}: {
  points: Array<{ label: string; value: number }>;
  label: string;
  max?: number;
}) {
  if (!points.length) return <p className="text-sm text-muted-foreground">Brak danych do wykresu.</p>;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex h-40 items-end gap-1 border-b pb-1">
        {points.map((pt) => (
          <div key={pt.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-primary/80"
              style={{ height: `${Math.max(4, (pt.value / max) * 100)}%` }}
              title={`${pt.label}: ${pt.value}`}
            />
            <span className="max-w-[48px] truncate text-[10px] text-muted-foreground">{pt.label.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PlayerDevelopmentPanel({
  player,
  detail,
  canManage,
  teamAverage,
}: {
  player: Player;
  detail: PlayerDevelopmentDetail;
  canManage: boolean;
  teamAverage?: number;
}) {
  const [range, setRange] = useState<DevelopmentChartRange>("year");
  const [devState, devAction, devPending] = useActionState(upsertPlayerDevelopmentAction, initial);
  const [assessState, assessAction, assessPending] = useActionState(addPlayerAssessmentAction, initial);
  const [goalAction, goalPending] = useActionState(upsertPlayerGoalAction, initial);
  const [testAction, testPending] = useActionState(addFitnessTestAction, initial);
  const [transAction, transPending] = useActionState(addTeamTransitionAction, initial);

  const history = filterByChartRange(detail.history, range, "recordedAt");
  const chartPoints = history.map((h) => ({
    label: h.recordedAt.slice(0, 10),
    value: h.overallRating,
  }));

  const teamPoints = teamAverage != null
    ? chartPoints.map((p) => ({ label: p.label, value: teamAverage }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{player.firstName} {player.lastName}</h2>
        <p className="text-sm text-muted-foreground">Profil rozwoju zawodnika</p>
      </div>

      {(devState.error || devState.success) && (
        <p className={`text-sm ${devState.error ? "text-destructive" : "text-green-700"}`}>{devState.error || devState.success}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Potencjał", value: detail.development?.potential ?? "—" },
          { label: "Poziom rozwoju", value: detail.development?.developmentLevel ?? "—" },
          { label: "Ocena ogólna", value: detail.development?.overallRating ?? "—" },
        ].map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl">{item.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Wykres rozwoju</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            {(Object.keys(DEVELOPMENT_CHART_RANGE_LABELS) as DevelopmentChartRange[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`min-h-[44px] rounded-md border px-3 text-sm ${range === r ? "bg-primary text-primary-foreground" : ""}`}
              >
                {DEVELOPMENT_CHART_RANGE_LABELS[r]}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-2">
          <SimpleLineChart points={chartPoints} label="Ocena ogólna (zawodnik)" />
          {teamAverage != null ? (
            <SimpleLineChart points={teamPoints.length ? teamPoints : chartPoints.map((p) => ({ ...p, value: teamAverage }))} label={`Średnia drużyny (~${teamAverage})`} />
          ) : null}
        </CardContent>
      </Card>

      {canManage ? (
        <form action={devAction} className="grid max-w-xl gap-3 rounded-xl border p-4 md:grid-cols-3">
          <input type="hidden" name="playerId" value={player.id} />
          <input name="potential" type="number" min={1} max={100} placeholder="Potencjał" defaultValue={detail.development?.potential} className={selectClass} required />
          <input name="developmentLevel" type="number" min={1} max={100} placeholder="Poziom" defaultValue={detail.development?.developmentLevel} className={selectClass} required />
          <input name="overallRating" type="number" min={1} max={100} placeholder="Ocena ogólna" defaultValue={detail.development?.overallRating} className={selectClass} required />
          <input name="historyNote" placeholder="Notatka do historii" className={`${selectClass} md:col-span-3`} />
          <Button type="submit" disabled={devPending} className="min-h-[44px] md:col-span-3">Zapisz profil rozwoju</Button>
        </form>
      ) : null}

      <section className="space-y-3">
        <h3 className="font-semibold">Oceny trenerskie</h3>
        {(assessState.error || assessState.success) && <p className="text-sm text-green-700">{assessState.error || assessState.success}</p>}
        <div className="space-y-2">
          {detail.assessments.slice().reverse().slice(0, 5).map((a) => (
            <div key={a.id} className="rounded-lg border p-3 text-sm">
              <p className="font-medium">{a.assessedAt} · średnia {a.averageScore}/10</p>
              <p className="text-muted-foreground">{a.assessorName ?? "Trener"}</p>
            </div>
          ))}
        </div>
        {canManage ? (
          <form action={assessAction} className="grid gap-2 rounded-xl border p-4 md:grid-cols-3">
            <input type="hidden" name="playerId" value={player.id} />
            {Object.keys(ASSESSMENT_CATEGORY_LABELS).map((key) => (
              <label key={key} className="text-sm">
                {ASSESSMENT_CATEGORY_LABELS[key as keyof typeof ASSESSMENT_CATEGORY_LABELS]}
                <input name={key} type="number" min={1} max={10} defaultValue={7} className={selectClass} required />
              </label>
            ))}
            <Button type="submit" disabled={assessPending} className="min-h-[44px] md:col-span-3">Dodaj ocenę</Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Cele rozwojowe</h3>
        {detail.goals.map((g) => (
          <div key={g.id} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">{g.title}</p>
            <Badge variant="secondary">{PLAYER_GOAL_STATUS_LABELS[g.status]}</Badge>
          </div>
        ))}
        {canManage ? (
          <form action={goalAction} className="grid max-w-xl gap-3 rounded-xl border p-4">
            <input type="hidden" name="playerId" value={player.id} />
            <input name="title" placeholder="Cel (np. poprawa szybkości)" required className={selectClass} />
            <textarea name="description" placeholder="Opis" className="min-h-[60px] rounded-md border px-3 py-2 text-sm" />
            <Button type="submit" disabled={goalPending} className="min-h-[44px] w-fit">Dodaj cel</Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Testy motoryczne</h3>
        {detail.fitnessTests.slice().reverse().slice(0, 8).map((t) => (
          <div key={t.id} className="rounded-lg border p-3 text-sm">
            {FITNESS_TEST_TYPE_LABELS[t.testType]}: {t.resultValue} {t.unit} · {t.testDate}
          </div>
        ))}
        {canManage ? (
          <form action={testAction} className="grid max-w-xl gap-3 rounded-xl border p-4 md:grid-cols-2">
            <input type="hidden" name="playerId" value={player.id} />
            <select name="testType" className={selectClass} defaultValue="sprint_10m">
              {FITNESS_TEST_TYPES.map((t) => (
                <option key={t} value={t}>{FITNESS_TEST_TYPE_LABELS[t]}</option>
              ))}
            </select>
            <input name="resultValue" type="number" step="0.01" placeholder="Wynik" required className={selectClass} />
            <Button type="submit" disabled={testPending} className="min-h-[44px] md:col-span-2">Zapisz test</Button>
          </form>
        ) : null}
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Historia przejść</h3>
        {detail.transitions.map((t) => (
          <div key={t.id} className="rounded-lg border p-3 text-sm">
            <p className="font-medium">
              {t.fromAgeGroup ? ACADEMY_AGE_GROUP_LABELS[t.fromAgeGroup] : "—"} → {ACADEMY_AGE_GROUP_LABELS[t.toAgeGroup]}
            </p>
            <p>{t.transitionDate} · {TEAM_TRANSITION_TYPE_LABELS[t.transitionType]}</p>
            <p className="text-muted-foreground">{t.reason}</p>
          </div>
        ))}
        {canManage ? (
          <form action={transAction} className="grid max-w-xl gap-3 rounded-xl border p-4 md:grid-cols-2">
            <input type="hidden" name="playerId" value={player.id} />
            <select name="toAgeGroup" className={selectClass} defaultValue="seniorzy">
              {Object.entries(ACADEMY_AGE_GROUP_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
            <input name="reason" placeholder="Powód / decyzja trenera" required className={selectClass} />
            <Button type="submit" disabled={transPending} className="min-h-[44px] md:col-span-2">Zapisz przejście</Button>
          </form>
        ) : null}
      </section>
    </div>
  );
}

export function TalentRankingPanel({ ranking }: { ranking: TalentRankingEntry[] }) {
  return (
    <>
      <div className="space-y-3 md:hidden">
        {ranking.slice(0, 20).map((e) => (
          <div key={e.playerId} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">#{e.rank} {e.playerName}</p>
            <p className="text-muted-foreground">Talent score: {e.talentScore}</p>
          </div>
        ))}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Zawodnik</th>
              <th className="px-4 py-3">Ocena</th>
              <th className="px-4 py-3">Potencjał</th>
              <th className="px-4 py-3">Oceny trenera</th>
              <th className="px-4 py-3">Talent score</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((e) => (
              <tr key={e.playerId} className="border-b last:border-0">
                <td className="px-4 py-3">{e.rank}</td>
                <td className="px-4 py-3">
                  <Link href={`/academy/development/${e.playerId}`} className="underline">{e.playerName}</Link>
                </td>
                <td className="px-4 py-3">{e.overallRating}</td>
                <td className="px-4 py-3">{e.potential}</td>
                <td className="px-4 py-3">{e.averageAssessment.toFixed(1)}</td>
                <td className="px-4 py-3 font-medium">{e.talentScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function ScoutingPanel({
  players,
  reports,
  clubs,
  canManage,
}: {
  players: ScoutingPlayer[];
  reports: ScoutingReport[];
  clubs: ScoutingClub[];
  canManage: boolean;
}) {
  const [playerState, playerAction, playerPending] = useActionState(upsertScoutingPlayerAction, initial);
  const [reportState, reportAction, reportPending] = useActionState(addScoutingReportAction, initial);
  const [clubState, clubAction, clubPending] = useActionState(upsertScoutingClubAction, initial);

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Obserwowani zawodnicy</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {players.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{p.firstName} {p.lastName}</CardTitle>
                <CardDescription>{p.externalClubName} · {p.position}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge>{SCOUTING_PLAYER_STATUS_LABELS[p.status]}</Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Raporty skautingowe</h2>
        {reports.map((r) => (
          <div key={r.id} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">{r.playerName ?? "Zawodnik"} · {r.reportDate} · {r.finalRating}/10</p>
            <p className="mt-1 text-muted-foreground">{r.summary}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Baza klubów</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <div key={c.id} className="rounded-xl border p-4 text-sm">
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground">{SCOUTING_CLUB_TYPE_LABELS[c.clubType]}{c.city ? ` · ${c.city}` : ""}</p>
            </div>
          ))}
        </div>
      </section>

      {canManage ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <form action={playerAction} className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Dodaj obserwowanego</h3>
            {playerState.error || playerState.success ? <p className="text-sm">{playerState.error || playerState.success}</p> : null}
            <input name="firstName" placeholder="Imię" required className={selectClass} />
            <input name="lastName" placeholder="Nazwisko" required className={selectClass} />
            <input name="externalClubName" placeholder="Klub" required className={selectClass} />
            <select name="position" className={selectClass}>
              <option value="goalkeeper">Bramkarz</option>
              <option value="defender">Obrońca</option>
              <option value="midfielder">Pomocnik</option>
              <option value="forward">Napastnik</option>
            </select>
            <Button type="submit" disabled={playerPending} className="min-h-[44px]">Zapisz</Button>
          </form>

          <form action={reportAction} className="space-y-3 rounded-xl border p-4">
            <h3 className="font-semibold">Nowy raport</h3>
            {reportState.error || reportState.success ? <p className="text-sm">{reportState.error || reportState.success}</p> : null}
            <select name="scoutingPlayerId" className={selectClass} required>
              <option value="">Wybierz zawodnika</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.firstName} {p.lastName}</option>
              ))}
            </select>
            {(["technique", "motorics", "tactics", "character", "potential"] as const).map((k) => (
              <input key={k} name={k} type="number" min={1} max={10} placeholder={k} defaultValue={7} className={selectClass} required />
            ))}
            <input name="finalRating" type="number" min={1} max={10} placeholder="Ocena końcowa" defaultValue={7} className={selectClass} required />
            <textarea name="summary" placeholder="Podsumowanie" className="min-h-[80px] w-full rounded-md border px-3 py-2 text-sm" />
            <Button type="submit" disabled={reportPending} className="min-h-[44px]">Dodaj raport</Button>
          </form>

          <form action={clubAction} className="space-y-3 rounded-xl border p-4 lg:col-span-2">
            <h3 className="font-semibold">Klub obserwowany</h3>
            {clubState.error || clubState.success ? <p className="text-sm">{clubState.error || clubState.success}</p> : null}
            <div className="grid gap-3 md:grid-cols-3">
              <input name="name" placeholder="Nazwa klubu" required className={selectClass} />
              <select name="clubType" className={selectClass}>
                {Object.entries(SCOUTING_CLUB_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
              <input name="city" placeholder="Miasto" className={selectClass} />
            </div>
            <Button type="submit" disabled={clubPending} className="min-h-[44px]">Zapisz klub</Button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export function OpponentsPanel({
  analyses,
  clubs,
  canManage,
}: {
  analyses: OpponentAnalysis[];
  clubs: ScoutingClub[];
  canManage: boolean;
}) {
  const [state, action, pending] = useActionState(upsertOpponentAnalysisAction, initial);

  return (
    <div className="space-y-6">
      {analyses.map((a) => (
        <Card key={a.id}>
          <CardHeader>
            <CardTitle>{a.opponentName}</CardTitle>
            <CardDescription>{a.analysisDate}{a.authorName ? ` · ${a.authorName}` : ""}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm md:grid-cols-2">
            <div><p className="font-medium">Mocne strony</p><p className="text-muted-foreground">{a.strengths}</p></div>
            <div><p className="font-medium">Słabe strony</p><p className="text-muted-foreground">{a.weaknesses}</p></div>
            <div><p className="font-medium">Kluczowi zawodnicy</p><p className="text-muted-foreground">{a.keyPlayers}</p></div>
            <div><p className="font-medium">Ustawienie</p><p className="text-muted-foreground">{a.tacticalSetup}</p></div>
          </CardContent>
        </Card>
      ))}

      {canManage ? (
        <form action={action} className="grid max-w-2xl gap-3 rounded-xl border p-4">
          <h3 className="font-semibold">Nowa analiza przeciwnika</h3>
          {state.error || state.success ? <p className="text-sm">{state.error || state.success}</p> : null}
          <input name="opponentName" placeholder="Nazwa przeciwnika" required className={selectClass} />
          <select name="scoutingClubId" className={selectClass}>
            <option value="">— klub z bazy (opcjonalnie) —</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <textarea name="strengths" placeholder="Mocne strony" required className="min-h-[60px] rounded-md border px-3 py-2 text-sm" />
          <textarea name="weaknesses" placeholder="Słabe strony" required className="min-h-[60px] rounded-md border px-3 py-2 text-sm" />
          <textarea name="keyPlayers" placeholder="Kluczowi zawodnicy" required className="min-h-[60px] rounded-md border px-3 py-2 text-sm" />
          <textarea name="tacticalSetup" placeholder="Ustawienie taktyczne" required className="min-h-[60px] rounded-md border px-3 py-2 text-sm" />
          <Button type="submit" disabled={pending} className="min-h-[44px] w-fit">Zapisz analizę</Button>
        </form>
      ) : null}
    </div>
  );
}
