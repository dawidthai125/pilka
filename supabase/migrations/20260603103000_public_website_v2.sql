-- Public Website 2.0 — teams + club stats for multi-club homepage

CREATE OR REPLACE FUNCTION public.get_public_teams(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
BEGIN
  SELECT c.id INTO v_club_id
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND c.status = 'active';

  IF v_club_id IS NULL OR NOT public.website_is_public(v_club_id) THEN
    RETURN '[]'::jsonb;
  END IF;

  RETURN COALESCE(
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
              WHERE p.team_id = t.id AND p.club_id = v_club_id AND p.status = 'active'
            ),
            'coachName', (
              SELECT pr.full_name
              FROM public.academy_groups ag
              JOIN public.academy_group_staff ags
                ON ags.group_id = ag.id AND ags.staff_role = 'head_coach'
              JOIN public.profiles pr ON pr.id = ags.profile_id
              WHERE ag.team_id = t.id AND ag.club_id = v_club_id
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
        LEFT JOIN public.academy_groups ag ON ag.team_id = t.id AND ag.club_id = v_club_id
        WHERE t.club_id = v_club_id AND t.is_active = TRUE
      ) sub
    ),
    '[]'::jsonb
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_club_stats(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_created_at TIMESTAMPTZ;
BEGIN
  SELECT c.id, c.created_at INTO v_club_id, v_created_at
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND c.status = 'active';

  IF v_club_id IS NULL OR NOT public.website_is_public(v_club_id) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'playersCount', (
      SELECT COUNT(*)::INTEGER FROM public.players p
      WHERE p.club_id = v_club_id AND p.status = 'active'
    ),
    'teamsCount', (
      SELECT COUNT(*)::INTEGER FROM public.teams t
      WHERE t.club_id = v_club_id AND t.is_active = TRUE
    ),
    'matchesPlayed', (
      SELECT COUNT(*)::INTEGER FROM public.matches m
      WHERE m.club_id = v_club_id AND m.status = 'completed'
    ),
    'yearsActive', GREATEST(
      1,
      EXTRACT(YEAR FROM age(timezone('utc', now()), v_created_at))::INTEGER
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_teams(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_club_stats(TEXT) TO anon, authenticated;
