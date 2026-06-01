import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_LEAGUE_IMPORT_ROWS = 500;
export const MAX_TEAM_NAME_LENGTH = 120;
export const MAX_TABLE_STAT = 999;

/** Neutralizuje formuły CSV/Excel (=,+,-,@) przy imporcie. */
export function sanitizeLeagueImportText(value: string, maxLen = MAX_TEAM_NAME_LENGTH): string {
  let text = String(value ?? "").trim();
  if (!text) return "";
  while (/^[=+\-@\t\r]/.test(text)) {
    text = text.slice(1).trimStart();
  }
  return text.slice(0, maxLen);
}

export function clampTableStat(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_TABLE_STAT, Math.round(value)));
}

export function isValidLeagueMatchDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime());
}

export function isAllowedLeagueImportFileName(fileName: string, adapter: string): boolean {
  const lower = fileName.toLowerCase();
  if (adapter === "json") return lower.endsWith(".json") || lower.endsWith(".txt");
  if (adapter === "xlsx") return lower.endsWith(".xlsx") || lower.endsWith(".csv");
  if (adapter === "csv" || adapter === "manual") {
    return lower.endsWith(".csv") || lower.endsWith(".txt") || lower.endsWith(".json");
  }
  return true;
}

export function isXlsxBinaryContent(content: ArrayBuffer): boolean {
  const bytes = new Uint8Array(content.slice(0, 4));
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

export type LeagueImportContext = {
  competitionId: string;
  seasonId: string;
  sourceId: string | null;
};

export async function assertLeagueImportContext(
  supabase: SupabaseClient,
  clubId: string,
  ctx: LeagueImportContext,
): Promise<{ error: string } | { ok: true; competitionName: string; seasonName: string }> {
  const { data: competition, error: compErr } = await supabase
    .from("league_competitions")
    .select("id, club_id, name, season_id, season:league_seasons(name)")
    .eq("id", ctx.competitionId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (compErr || !competition) {
    return { error: "Rozgrywki nie należą do tego klubu." };
  }

  if (String(competition.season_id) !== ctx.seasonId) {
    return { error: "Sezon nie pasuje do wybranych rozgrywek." };
  }

  const { data: season, error: seasonErr } = await supabase
    .from("league_seasons")
    .select("id")
    .eq("id", ctx.seasonId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (seasonErr || !season) {
    return { error: "Sezon nie należy do tego klubu." };
  }

  if (ctx.sourceId) {
    const { data: source, error: sourceErr } = await supabase
      .from("league_sources")
      .select("id, competition_id")
      .eq("id", ctx.sourceId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (sourceErr || !source) {
      return { error: "Źródło danych nie należy do tego klubu." };
    }

    if (source.competition_id && String(source.competition_id) !== ctx.competitionId) {
      return { error: "Źródło danych nie pasuje do rozgrywek." };
    }
  }

  const seasonRow = competition.season as { name?: string } | null;
  return {
    ok: true,
    competitionName: String(competition.name),
    seasonName: seasonRow?.name ? String(seasonRow.name) : "",
  };
}

export async function assertLeagueCompetitionBelongsToClub(
  supabase: SupabaseClient,
  clubId: string,
  competitionId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("league_competitions")
    .select("id", { count: "exact", head: true })
    .eq("id", competitionId)
    .eq("club_id", clubId);
  return (count ?? 0) > 0;
}

export async function assertPlayerBelongsToClub(
  supabase: SupabaseClient,
  clubId: string,
  playerId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("id", playerId)
    .eq("club_id", clubId);
  return (count ?? 0) > 0;
}

export async function assertLeagueSeasonBelongsToClub(
  supabase: SupabaseClient,
  clubId: string,
  seasonId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("league_seasons")
    .select("id", { count: "exact", head: true })
    .eq("id", seasonId)
    .eq("club_id", clubId);
  return (count ?? 0) > 0;
}
