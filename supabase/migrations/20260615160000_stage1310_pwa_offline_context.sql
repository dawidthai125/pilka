-- ETAP 13.10 — slim single-RPC payload for PWA offline cache

CREATE OR REPLACE FUNCTION public.get_pwa_offline_context(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = v_user_id AND club_id = p_club_id AND status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'email', p.email,
        'full_name', p.full_name,
        'roles', COALESCE((
          SELECT jsonb_agg(cm.role ORDER BY cm.role)
          FROM public.club_memberships cm
          WHERE cm.user_id = v_user_id
            AND cm.club_id = p_club_id
            AND cm.status = 'active'
        ), '[]'::jsonb)
      )
      FROM public.profiles p
      WHERE p.id = v_user_id
    ),
    'club', (
      SELECT jsonb_build_object(
        'id', c.id,
        'slug', c.slug,
        'public_name', c.public_name
      )
      FROM public.clubs c
      WHERE c.id = p_club_id
    ),
    'teams', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object('id', t.id, 'name', t.name)
        ORDER BY t.name
      )
      FROM public.teams t
      WHERE t.club_id = p_club_id
    ), '[]'::jsonb),
    'recent_matches', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'home_team_name', m.home_team_name,
          'away_team_name', m.away_team_name,
          'match_date', m.match_date,
          'status', m.status,
          'home_score', m.home_score,
          'away_score', m.away_score
        )
        ORDER BY m.match_date DESC
      )
      FROM (
        SELECT id, home_team_name, away_team_name, match_date, status, home_score, away_score
        FROM public.matches
        WHERE club_id = p_club_id
        ORDER BY match_date DESC
        LIMIT 10
      ) m
    ), '[]'::jsonb),
    'recent_trainings', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', tr.id,
          'name', tr.name,
          'training_date', tr.training_date,
          'status', tr.status,
          'team_id', tr.team_id
        )
        ORDER BY tr.training_date DESC
      )
      FROM (
        SELECT id, name, training_date, status, team_id
        FROM public.trainings
        WHERE club_id = p_club_id
        ORDER BY training_date DESC
        LIMIT 10
      ) tr
    ), '[]'::jsonb),
    'news', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', n.id,
          'title', n.title,
          'slug', n.slug,
          'published_at', n.published_at
        )
        ORDER BY n.published_at DESC
      )
      FROM (
        SELECT id, title, slug, published_at
        FROM public.website_news
        WHERE club_id = p_club_id
          AND status = 'published'
        ORDER BY published_at DESC
        LIMIT 5
      ) n
    ), '[]'::jsonb),
    'primary_color', (
      SELECT ws.primary_color
      FROM public.website_settings ws
      WHERE ws.club_id = p_club_id
    ),
    'secondary_color', (
      SELECT ws.secondary_color
      FROM public.website_settings ws
      WHERE ws.club_id = p_club_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_pwa_offline_context(UUID) TO authenticated;
