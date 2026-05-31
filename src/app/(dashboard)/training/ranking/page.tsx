import { Suspense } from "react";

import { EngagementRanking } from "@/features/training/components/engagement-ranking";
import {
  getAttendanceStats,
  getDashboardContext,
  getTeams,
  requireTrainingReadAccess,
} from "@/lib/auth/session";
import type { AttendanceScope } from "@/types/trainings";

type SearchParams = Promise<{ scope?: string; team?: string }>;

function parseScope(value: string | undefined): AttendanceScope {
  if (value === "month" || value === "all") return value;
  return "season";
}

async function RankingSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const scope = parseScope(params.scope);
  const teamId = params.team;

  const { access } = await getDashboardContext();
  requireTrainingReadAccess(access);

  const [stats, teams] = await Promise.all([
    getAttendanceStats(scope, undefined, teamId),
    getTeams(),
  ]);

  return (
    <EngagementRanking stats={stats} teams={teams} scope={scope} teamId={teamId} />
  );
}

export default function TrainingRankingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ranking zaangażowania</h1>
        <p className="text-sm text-muted-foreground">
          TOP 10 najbardziej i najmniej zaangażowanych zawodników według frekwencji i punktualności.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Ładowanie rankingu...</p>}>
        <RankingSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
