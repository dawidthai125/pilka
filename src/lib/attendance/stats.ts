import type {
  AttendanceRecordRow,
  CoachAttendanceReport,
  PlayerAvailabilityRow,
  PlayerFrequencyStats,
} from "@/types/attendance";

function rate(present: number, total: number): number {
  if (!total) return 0;
  return Math.round((present / total) * 100);
}

export function computeFrequencyStats(
  players: { id: string; name: string; status: string }[],
  records: AttendanceRecordRow[],
  availability: PlayerAvailabilityRow[],
): PlayerFrequencyStats[] {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  return players.map((player) => {
    const playerRecords = records.filter((r) => r.playerId === player.id);
    const trainingRecords = playerRecords.filter((r) => r.sourceType === "training");
    const matchRecords = playerRecords.filter((r) => r.sourceType === "match");
    const monthRecords = playerRecords.filter((r) => r.recordedAt >= monthStart);

    const trainingPresent = trainingRecords.filter((r) => r.attendanceStatus === "present").length;
    const matchPresent = matchRecords.filter((r) => r.attendanceStatus === "present").length;
    const monthPresent = monthRecords.filter((r) => r.attendanceStatus === "present").length;

    const recentAvail = availability
      .filter((a) => a.playerId === player.id)
      .slice(0, 5);
    let consecutiveAbsences = 0;
    for (const row of recentAvail) {
      if (row.status === "absent") consecutiveAbsences += 1;
      else break;
    }

    const injuryAvail = availability.filter(
      (a) => a.playerId === player.id && a.absenceReason === "injury" && a.status === "absent",
    );

    return {
      playerId: player.id,
      playerName: player.name,
      trainingRate: rate(trainingPresent, trainingRecords.length),
      matchRate: rate(matchPresent, matchRecords.length),
      monthRate: rate(monthPresent, monthRecords.length),
      seasonRate: rate(
        playerRecords.filter((r) => r.attendanceStatus === "present").length,
        playerRecords.length,
      ),
      consecutiveAbsences,
      isInjured: player.status === "injured" || injuryAvail.length > 0,
    };
  });
}

export function computeCoachReport(stats: PlayerFrequencyStats[]): CoachAttendanceReport {
  const sorted = [...stats].sort((a, b) => b.seasonRate - a.seasonRate);
  return {
    bestAttendance: sorted.slice(0, 5),
    worstAttendance: [...stats].sort((a, b) => a.seasonRate - b.seasonRate).slice(0, 5),
    serialAbsences: stats.filter((s) => s.consecutiveAbsences >= 3).slice(0, 10),
    injured: stats.filter((s) => s.isInjured).slice(0, 10),
  };
}
