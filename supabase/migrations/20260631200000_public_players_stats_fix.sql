-- Kadra publiczna: statystyki z player_stats (bieżący sezon) + fallback z league_player_registry.

CREATE OR REPLACE FUNCTION public.get_public_players(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH active_season AS (
    SELECT ls.name
    FROM public.clubs c
    JOIN public.league_seasons ls ON ls.club_id = c.id AND ls.is_active = TRUE
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    ORDER BY ls.updated_at DESC NULLS LAST
    LIMIT 1
  )
  SELECT COALESCE(jsonb_agg(row ORDER BY jersey_number NULLS LAST, last_name, first_name), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'jerseyNumber', p.jersey_number,
      'position', p.primary_position,
      'goals', GREATEST(
        COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = COALESCE((SELECT name FROM active_season), '2025/2026')), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
      ),
      'assists', GREATEST(
        COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = COALESCE((SELECT name FROM active_season), '2025/2026')), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'assists')::int), 0)
      ),
      'matchesPlayed', GREATEST(
        COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = COALESCE((SELECT name FROM active_season), '2025/2026')), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'appearances')::int), 0)
      )
    ) AS row,
    p.jersey_number,
    p.last_name,
    p.first_name
    FROM public.clubs c
    JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
    LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
    LEFT JOIN public.league_player_registry lpr ON lpr.player_id = p.id AND lpr.club_id = c.id
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    GROUP BY p.id, p.first_name, p.last_name, p.jersey_number, p.primary_position
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.get_public_team_stats(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH active_season AS (
    SELECT ls.name
    FROM public.clubs c
    JOIN public.league_seasons ls ON ls.club_id = c.id AND ls.is_active = TRUE
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    ORDER BY ls.updated_at DESC NULLS LAST
    LIMIT 1
  ),
  season_name AS (
    SELECT COALESCE((SELECT name FROM active_season), '2025/2026') AS name
  )
  SELECT jsonb_build_object(
    'playersCount', COUNT(DISTINCT p.id)::INTEGER,
    'goals', COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = (SELECT name FROM season_name)), 0)::INTEGER,
    'assists', COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = (SELECT name FROM season_name)), 0)::INTEGER,
    'matchesPlayed', COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = (SELECT name FROM season_name)), 0)::INTEGER
  )
  FROM public.clubs c
  JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
  LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id)
  GROUP BY c.id;
$$;
