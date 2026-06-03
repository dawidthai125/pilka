-- Hotfix: get_public_home_bundle bez zależności od academy_groups (brak modułu na części prod DB)

CREATE OR REPLACE FUNCTION public.get_public_home_bundle(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club public.clubs%ROWTYPE;
  v_settings public.website_settings%ROWTYPE;
  v_season_name TEXT;
  v_competition_name TEXT;
  v_next_match JSONB;
  v_last_match JSONB;
  v_recent_results JSONB;
  v_news JSONB;
  v_teams JSONB;
  v_sponsors JSONB;
  v_players JSONB;
  v_top_scorers JSONB;
  v_club_stats JSONB;
  v_team_stats JSONB;
  v_league JSONB;
  v_media JSONB;
  v_academy JSONB;
  v_has_academy BOOLEAN;
BEGIN
  SELECT c.* INTO v_club
  FROM public.clubs c
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT ws.* INTO v_settings
  FROM public.website_settings ws
  WHERE ws.club_id = v_club.id;

  SELECT ls.name INTO v_season_name
  FROM public.league_seasons ls
  WHERE ls.club_id = v_club.id AND ls.is_active = TRUE
  ORDER BY ls.updated_at DESC NULLS LAST
  LIMIT 1;

  v_season_name := COALESCE(v_season_name, '2025/2026');

  SELECT lc.name INTO v_competition_name
  FROM public.league_competitions lc
  WHERE lc.club_id = v_club.id AND lc.is_active = TRUE
  ORDER BY lc.name
  LIMIT 1;

  v_competition_name := COALESCE(v_competition_name, 'B Klasa');

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'academy_groups'
  ) INTO v_has_academy;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_next_match
  FROM public.matches m
  WHERE m.club_id = v_club.id
    AND m.status IN ('planned', 'in_progress')
    AND m.match_date >= CURRENT_DATE
  ORDER BY m.match_date, m.match_time
  LIMIT 1;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_last_match
  FROM public.matches m
  WHERE m.club_id = v_club.id
    AND m.status = 'completed'
    AND m.match_date <= CURRENT_DATE
  ORDER BY m.match_date DESC, m.match_time DESC, m.round_number DESC
  LIMIT 1;

  SELECT COALESCE(jsonb_agg(row ORDER BY sort_date DESC, sort_round DESC, sort_time DESC), '[]'::jsonb)
  INTO v_recent_results
  FROM (
    SELECT
      jsonb_build_object(
        'id', m.id,
        'matchDate', m.match_date,
        'matchTime', m.match_time,
        'homeTeamName', m.home_team_name,
        'awayTeamName', m.away_team_name,
        'homeScore', m.home_score,
        'awayScore', m.away_score,
        'stadium', m.stadium,
        'competition', m.competition,
        'roundNumber', m.round_number,
        'status', m.status
      ) AS row,
      m.match_date AS sort_date,
      m.round_number AS sort_round,
      m.match_time AS sort_time
    FROM public.matches m
    WHERE m.club_id = v_club.id
      AND m.status = 'completed'
      AND m.match_date <= CURRENT_DATE
    ORDER BY m.match_date DESC, m.round_number DESC, m.match_time DESC
    LIMIT 8
  ) sub;

  SELECT COALESCE(jsonb_agg(row ORDER BY published_at DESC NULLS LAST), '[]'::jsonb)
  INTO v_news
  FROM (
    SELECT
      jsonb_build_object(
        'id', n.id,
        'slug', n.slug,
        'title', n.title,
        'excerpt', n.excerpt,
        'featuredImagePath', n.featured_image_path,
        'category', n.category,
        'authorName', pr.full_name,
        'publishedAt', n.published_at
      ) AS row,
      n.published_at
    FROM public.website_news n
    LEFT JOIN public.profiles pr ON pr.id = n.author_id
    WHERE n.club_id = v_club.id
      AND n.status = 'published'
    ORDER BY n.published_at DESC NULLS LAST
    LIMIT 6
  ) sub;

  IF v_has_academy THEN
    SELECT COALESCE(
      (
        SELECT jsonb_agg(sub.row ORDER BY sub.sort_order, sub.team_name)
        FROM (
          SELECT
            jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'category', t.category,
              'season', t.season,
              'playersCount', (
                SELECT COUNT(*)::INTEGER
                FROM public.players p
                WHERE p.team_id = t.id AND p.club_id = v_club.id AND p.status = 'active'
              ),
              'coachName', (
                SELECT pr.full_name
                FROM public.academy_groups ag
                JOIN public.academy_group_staff ags
                  ON ags.group_id = ag.id AND ags.staff_role = 'head_coach'
                JOIN public.profiles pr ON pr.id = ags.profile_id
                WHERE ag.team_id = t.id AND ag.club_id = v_club.id
                LIMIT 1
              ),
              'description', ag.description,
              'ageGroup', ag.age_group
            ) AS row,
            CASE t.category
              WHEN 'seniors' THEN 1
              WHEN 'u18' THEN 2
              WHEN 'u12' THEN 3
              WHEN 'u10' THEN 4
              ELSE 5
            END AS sort_order,
            t.name AS team_name
          FROM public.teams t
          LEFT JOIN public.academy_groups ag ON ag.team_id = t.id AND ag.club_id = v_club.id
          WHERE t.club_id = v_club.id AND t.is_active = TRUE
        ) sub
      ),
      '[]'::jsonb
    ) INTO v_teams;
  ELSE
    SELECT COALESCE(
      (
        SELECT jsonb_agg(sub.row ORDER BY sub.sort_order, sub.team_name)
        FROM (
          SELECT
            jsonb_build_object(
              'id', t.id,
              'name', t.name,
              'category', t.category,
              'season', t.season,
              'playersCount', (
                SELECT COUNT(*)::INTEGER
                FROM public.players p
                WHERE p.team_id = t.id AND p.club_id = v_club.id AND p.status = 'active'
              ),
              'coachName', NULL,
              'description', NULL,
              'ageGroup', NULL
            ) AS row,
            CASE t.category
              WHEN 'seniors' THEN 1
              WHEN 'u18' THEN 2
              WHEN 'u12' THEN 3
              WHEN 'u10' THEN 4
              ELSE 5
            END AS sort_order,
            t.name AS team_name
          FROM public.teams t
          WHERE t.club_id = v_club.id AND t.is_active = TRUE
        ) sub
      ),
      '[]'::jsonb
    ) INTO v_teams;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', s.id,
      'companyName', s.company_name,
      'logoUrl', s.logo_url,
      'website', s.website,
      'publicTier', s.public_tier,
      'publicDescription', s.public_description
    ) ORDER BY
      CASE s.public_tier WHEN 'main' THEN 1 WHEN 'supporting' THEN 2 ELSE 3 END,
      s.company_name
  ), '[]'::jsonb)
  INTO v_sponsors
  FROM public.sponsors s
  WHERE s.club_id = v_club.id
    AND s.show_on_website = TRUE
    AND s.cooperation_status IN ('active', 'expiring');

  WITH player_rows AS (
    SELECT
      jsonb_build_object(
        'id', p.id,
        'firstName', p.first_name,
        'lastName', p.last_name,
        'jerseyNumber', p.jersey_number,
        'position', p.primary_position,
        'goals', GREATEST(
          COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
        ),
        'assists', GREATEST(
          COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'assists')::int), 0)
        ),
        'matchesPlayed', GREATEST(
          COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = v_season_name), 0),
          COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'appearances')::int), 0)
        )
      ) AS row,
      p.jersey_number,
      p.last_name,
      p.first_name,
      GREATEST(
        COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0),
        COALESCE(MAX((lpr.notes::jsonb -> 'stats' ->> 'goals')::int), 0)
      ) AS goals_total
    FROM public.players p
    LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = v_club.id
    LEFT JOIN public.league_player_registry lpr ON lpr.player_id = p.id AND lpr.club_id = v_club.id
    WHERE p.club_id = v_club.id AND p.status = 'active'
    GROUP BY p.id, p.first_name, p.last_name, p.jersey_number, p.primary_position
  )
  SELECT
    COALESCE(jsonb_agg(row ORDER BY jersey_number NULLS LAST, last_name, first_name), '[]'::jsonb),
    COALESCE(
      (
        SELECT jsonb_agg(row ORDER BY goals_total DESC, matches_played DESC)
        FROM (
          SELECT row, goals_total,
            (row ->> 'matchesPlayed')::int AS matches_played
          FROM player_rows
          WHERE goals_total > 0
          ORDER BY goals_total DESC, (row ->> 'matchesPlayed')::int DESC
          LIMIT 5
        ) scorers
      ),
      '[]'::jsonb
    )
  INTO v_players, v_top_scorers
  FROM player_rows;

  SELECT jsonb_build_object(
    'playersCount', (
      SELECT COUNT(*)::INTEGER FROM public.players p
      WHERE p.club_id = v_club.id AND p.status = 'active'
    ),
    'teamsCount', (
      SELECT COUNT(*)::INTEGER FROM public.teams t
      WHERE t.club_id = v_club.id AND t.is_active = TRUE
    ),
    'matchesPlayed', (
      SELECT COUNT(*)::INTEGER FROM public.matches m
      WHERE m.club_id = v_club.id AND m.status = 'completed'
    ),
    'yearsActive', GREATEST(
      1,
      EXTRACT(YEAR FROM age(timezone('utc', now()), v_club.created_at))::INTEGER
    )
  ) INTO v_club_stats;

  SELECT jsonb_build_object(
    'playersCount', COUNT(DISTINCT p.id)::INTEGER,
    'goals', COALESCE(SUM(ps.goals) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER,
    'assists', COALESCE(SUM(ps.assists) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER,
    'matchesPlayed', COALESCE(SUM(ps.matches_played) FILTER (WHERE ps.season = v_season_name), 0)::INTEGER
  )
  INTO v_team_stats
  FROM public.players p
  LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = v_club.id
  WHERE p.club_id = v_club.id AND p.status = 'active';

  SELECT jsonb_build_object(
    'entries', COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', lte.id,
            'teamName', lte.team_name,
            'played', lte.played,
            'won', lte.won,
            'drawn', lte.drawn,
            'lost', lte.lost,
            'goalsFor', lte.goals_for,
            'goalsAgainst', lte.goals_against,
            'points', lte.points,
            'isOwnClub', lte.is_own_club
          ) ORDER BY lte.points DESC, (lte.goals_for - lte.goals_against) DESC, lte.goals_for DESC
        )
        FROM public.league_table_entries lte
        WHERE lte.club_id = v_club.id
          AND lte.competition = v_competition_name
          AND lte.season = v_season_name
      ),
      '[]'::jsonb
    ),
    'ownTeamName', v_club.public_name,
    'competition', v_competition_name,
    'season', v_season_name
  ) INTO v_league;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', wm.id,
      'section', wm.section,
      'slotKey', wm.slot_key,
      'storagePath', wm.storage_path,
      'demoAssetKey', wm.demo_asset_key,
      'caption', wm.caption,
      'teamId', wm.team_id,
      'newsId', wm.news_id,
      'sortOrder', wm.sort_order
    ) ORDER BY wm.section, wm.sort_order
  ), '[]'::jsonb)
  INTO v_media
  FROM public.website_media wm
  WHERE wm.club_id = v_club.id AND wm.is_active = TRUE;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'slotKey', wm.slot_key,
      'storagePath', wm.storage_path,
      'demoAssetKey', wm.demo_asset_key,
      'caption', wm.caption
    ) ORDER BY wm.sort_order
  ), '[]'::jsonb)
  INTO v_academy
  FROM public.website_media wm
  WHERE wm.club_id = v_club.id
    AND wm.is_active = TRUE
    AND wm.section = 'academy';

  RETURN jsonb_build_object(
    'club', jsonb_build_object(
      'id', v_club.id,
      'slug', v_club.slug,
      'publicName', v_club.public_name,
      'officialName', v_club.official_name,
      'competitionLevel', v_club.competition_level,
      'voivodeship', v_club.voivodeship
    ),
    'branding', jsonb_build_object(
      'logoPath', v_settings.logo_path,
      'logoDarkPath', v_settings.logo_dark_path,
      'primaryColor', v_settings.primary_color,
      'secondaryColor', v_settings.secondary_color,
      'accentColor', v_settings.accent_color,
      'heroImagePath', v_settings.hero_image_path,
      'heroTitle', COALESCE(v_settings.hero_title, v_club.public_name),
      'heroSubtitle', v_settings.hero_subtitle,
      'contactAddress', v_settings.contact_address,
      'contactEmail', v_settings.contact_email,
      'contactPhone', v_settings.contact_phone
    ),
    'news', v_news,
    'teams', v_teams,
    'academy', v_academy,
    'stats', jsonb_build_object('club', v_club_stats, 'team', v_team_stats),
    'nextMatch', v_next_match,
    'lastMatch', v_last_match,
    'recentResults', v_recent_results,
    'league', v_league,
    'players', v_players,
    'topScorers', v_top_scorers,
    'sponsors', v_sponsors,
    'media', v_media,
    'newsCount', (
      SELECT COUNT(*)::INTEGER FROM public.website_news n
      WHERE n.club_id = v_club.id AND n.status = 'published'
    ),
    'sponsorCount', jsonb_array_length(v_sponsors)
  );
END;
$$;
