/**
 * League sync tenant config — loaded from DB (no hardcoded LEAGUE_CONFIG).
 */

const MIRROR_SOURCE_NAME = "Mirror live";

function buildRegiowynikiKadraUrl(leagueTeamName) {
  const slug = String(leagueTeamName ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "");
  if (!slug) return null;
  return `https://regiowyniki.pl/druzyna/Pilka_Nozna/Dolnoslaskie/${slug}/kadra/`;
}

export async function listLeagueSyncClubs(supabase) {
  const { data: sources, error } = await supabase
    .from("league_sources")
    .select("id, club_id, competition_id, name, adapter, is_active, config")
    .eq("is_active", true)
    .ilike("name", `${MIRROR_SOURCE_NAME}%`);

  if (error) throw new Error(error.message);

  const byClub = new Map();
  for (const row of sources ?? []) {
    if (!row.club_id) continue;
    if (!byClub.has(row.club_id)) byClub.set(row.club_id, row);
  }

  const clubIds = [...byClub.keys()];
  if (!clubIds.length) return [];

  const { data: clubs } = await supabase
    .from("clubs")
    .select("id, slug, public_name, official_name, status")
    .in("id", clubIds)
    .eq("status", "active");

  return (clubs ?? []).map((club) => ({
    clubId: String(club.id),
    slug: String(club.slug),
    publicName: String(club.public_name),
    source: byClub.get(club.id),
  }));
}

export async function loadLeagueClubConfig(supabase, clubId) {
  const { data: season, error: seasonError } = await supabase
    .from("league_seasons")
    .select("id, name")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (seasonError) throw new Error(seasonError.message);
  if (!season) throw new Error(`Brak aktywnego sezonu ligowego dla klubu ${clubId}.`);

  const { data: competition, error: compError } = await supabase
    .from("league_competitions")
    .select("id, name")
    .eq("club_id", clubId)
    .eq("season_id", season.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (compError) throw new Error(compError.message);
  if (!competition) throw new Error(`Brak aktywnej ligi dla klubu ${clubId}.`);

  const { data: ownTeam } = await supabase
    .from("league_teams")
    .select("league_name, display_name")
    .eq("club_id", clubId)
    .eq("competition_id", competition.id)
    .eq("is_own_club", true)
    .maybeSingle();

  if (!ownTeam) throw new Error(`Brak league_teams.is_own_club dla klubu ${clubId}.`);

  const { data: source } = await supabase
    .from("league_sources")
    .select("id, config, name")
    .eq("club_id", clubId)
    .eq("competition_id", competition.id)
    .eq("is_active", true)
    .ilike("name", `${MIRROR_SOURCE_NAME}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!source) throw new Error(`Brak aktywnego źródła mirror live dla klubu ${clubId}.`);

  const config = source.config && typeof source.config === "object" ? source.config : {};
  const lnpRaw = config.lnp && typeof config.lnp === "object" ? config.lnp : {};

  const ninetyMinutUrl =
    config.ninetyMinutUrl ||
    config.ninety_minut_url ||
    (Array.isArray(config.sources)
      ? config.sources.find((s) => String(s).includes("90minut"))
      : null) ||
    "http://www.90minut.pl/liga/1/liga14526.html";

  const regionalnyFutbolUrl =
    config.regionalnyFutbolUrl ||
    config.regionalny_futbol_url ||
    (Array.isArray(config.sources)
      ? config.sources.find((s) => String(s).includes("regionalnyfutbol"))
      : null) ||
    "https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html";

  return {
    clubId,
    seasonId: String(season.id),
    seasonName: String(season.name),
    competitionId: String(competition.id),
    competitionName: String(competition.name),
    sourceId: String(source.id),
    ownLeagueName: String(ownTeam.league_name),
    ownDisplayName: String(ownTeam.display_name),
    sources: {
      ninetyMinut: {
        key: "90minut",
        label: "90minut.pl",
        tableUrl: String(ninetyMinutUrl),
      },
      regionalnyFutbol: {
        key: "regionalnyfutbol",
        label: "regionalnyfutbol.pl",
        pageUrl: String(regionalnyFutbolUrl),
      },
    },
    squadSources: {
      regiowynikiKadra:
        config.regiowynikiKadraUrl ||
        config.regiowyniki_kadra_url ||
        config.regiowynikiKadra ||
        buildRegiowynikiKadraUrl(ownTeam.league_name),
      ninetyMinutStrzelcy:
        config.ninetyMinutStrzelcyUrl || config.ninety_minut_strzelcy_url || null,
      ninetyMinutBilans:
        config.ninetyMinutBilansUrl || config.ninety_minut_bilans_url || null,
      ninetyMinutBilansFallback:
        config.ninetyMinutBilansFallbackUrl || config.ninety_minut_bilans_fallback_url || null,
    },
    lnpConfig: {
      accessToken: lnpRaw.accessToken || lnpRaw.token || "",
      teamId: lnpRaw.teamId || "",
      seasonId: lnpRaw.seasonId || "",
      leagueId: lnpRaw.leagueId || "",
      playId: lnpRaw.playId || "",
    },
  };
}
