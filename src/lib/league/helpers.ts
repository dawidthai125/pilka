import type { LeagueTeam } from "@/types/league";

export function isOwnLeagueTeamName(teamName: string, teams: LeagueTeam[]): boolean {
  const normalized = teamName.trim().toLowerCase();
  return teams.some(
    (t) =>
      t.isOwnClub &&
      (normalized === t.leagueName.trim().toLowerCase() ||
        normalized === t.displayName.trim().toLowerCase()),
  );
}

export function resolveLeagueDisplayName(teamName: string, teams: LeagueTeam[]): string {
  const normalized = teamName.trim().toLowerCase();
  for (const team of teams) {
    if (normalized === team.leagueName.trim().toLowerCase()) return team.displayName;
    if (normalized === team.displayName.trim().toLowerCase()) return team.displayName;
    if (teamName.includes(team.leagueName)) {
      return teamName.replace(team.leagueName, team.displayName);
    }
  }
  return teamName;
}

export function getOwnLeagueTeam(teams: LeagueTeam[]): LeagueTeam | undefined {
  return teams.find((t) => t.isOwnClub);
}

/** Kanoniczna nazwa ligowa do kluczy external_key (deduplikacja GLKS ↔ Piorun). */
export function canonicalLeagueTeamKeyName(teamName: string, teams: LeagueTeam[]): string {
  const normalized = teamName.trim().toLowerCase();
  for (const team of teams) {
    const league = team.leagueName.trim().toLowerCase();
    const display = team.displayName.trim().toLowerCase();
    if (normalized === league || normalized === display || teamName.includes(team.leagueName)) {
      return team.leagueName.trim();
    }
  }
  return teamName.trim();
}
