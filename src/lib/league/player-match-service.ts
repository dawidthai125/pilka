import { createClient } from "@/lib/supabase/server";
import {
  buildMatchFields,
  isLockedMatchStatus,
  MATCH_AUTO_THRESHOLD,
  type ClubPlayerCandidate,
} from "@/lib/league/player-matching";
import type { LeaguePlayerMatchStatus } from "@/types/league";

type RegistryRow = {
  id: string;
  league_player_name: string;
  player_id: string | null;
  suggested_player_id: string | null;
  match_status: LeaguePlayerMatchStatus;
  match_confidence: number | null;
};

function mapClubPlayers(
  rows: Array<{ id: string; first_name: string; last_name: string; email: string | null }>,
): ClubPlayerCandidate[] {
  return rows.map((row) => ({
    id: String(row.id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: row.email,
  }));
}

function toDbFields(fields: NonNullable<ReturnType<typeof buildMatchFields>>) {
  return {
    player_id: fields.playerId,
    suggested_player_id: fields.suggestedPlayerId,
    match_status: fields.matchStatus,
    match_confidence: fields.matchConfidence,
  };
}

export async function recomputeLeaguePlayerMatches(clubId: string): Promise<{
  updated: number;
  autoLinked: number;
  suggested: number;
  unmatched: number;
  skipped: number;
}> {
  const supabase = await createClient();

  const [{ data: registry }, { data: players }] = await Promise.all([
    supabase
      .from("league_player_registry")
      .select("id, league_player_name, player_id, suggested_player_id, match_status, match_confidence")
      .eq("club_id", clubId),
    supabase.from("players").select("id, first_name, last_name, email").eq("club_id", clubId),
  ]);

  const clubPlayers = mapClubPlayers(players ?? []);
  let updated = 0;
  let autoLinked = 0;
  let suggested = 0;
  let unmatched = 0;
  let skipped = 0;

  for (const row of (registry ?? []) as RegistryRow[]) {
    if (isLockedMatchStatus(row.match_status)) {
      skipped += 1;
      continue;
    }

    const fields = buildMatchFields(row.league_player_name, clubPlayers);
    if (!fields) {
      skipped += 1;
      continue;
    }

    const { error } = await supabase
      .from("league_player_registry")
      .update(toDbFields(fields))
      .eq("id", row.id)
      .eq("club_id", clubId);

    if (error) continue;

    updated += 1;
    if (fields.matchStatus === "auto_linked") autoLinked += 1;
    else if (fields.matchStatus === "suggested") suggested += 1;
    else unmatched += 1;
  }

  return { updated, autoLinked, suggested, unmatched, skipped };
}

export async function bulkApproveHighConfidenceMatches(clubId: string): Promise<number> {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("league_player_registry")
    .select("id, player_id, suggested_player_id, match_status, match_confidence")
    .eq("club_id", clubId)
    .gte("match_confidence", MATCH_AUTO_THRESHOLD)
    .in("match_status", ["suggested", "auto_linked"]);

  let approved = 0;

  for (const row of (rows ?? []) as Array<{
    id: string;
    player_id: string | null;
    suggested_player_id: string | null;
  }>) {
    const playerId = row.player_id ?? row.suggested_player_id;
    if (!playerId) continue;

    const { error } = await supabase
      .from("league_player_registry")
      .update({
        player_id: playerId,
        suggested_player_id: null,
        match_status: "confirmed",
      })
      .eq("id", row.id)
      .eq("club_id", clubId);

    if (!error) approved += 1;
  }

  return approved;
}
