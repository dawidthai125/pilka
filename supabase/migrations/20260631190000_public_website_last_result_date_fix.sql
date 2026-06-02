-- Ignore future-dated completed matches when picking lastResult for public homepage.
CREATE OR REPLACE FUNCTION public.get_public_website_home(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_club public.clubs%ROWTYPE;
  v_settings public.website_settings%ROWTYPE;
  v_next_match JSONB;
  v_last_result JSONB;
BEGIN
  SELECT c.* INTO v_club
  FROM public.clubs c
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id);

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_club_id := v_club.id;

  SELECT ws.* INTO v_settings
  FROM public.website_settings ws
  WHERE ws.club_id = v_club_id;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_next_match
  FROM public.matches m
  WHERE m.club_id = v_club_id
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
    'competition', m.competition,
    'roundNumber', m.round_number,
    'status', m.status
  ) INTO v_last_result
  FROM public.matches m
  WHERE m.club_id = v_club_id
    AND m.status = 'completed'
    AND m.match_date <= CURRENT_DATE
  ORDER BY m.match_date DESC, m.match_time DESC, m.round_number DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'club', jsonb_build_object(
      'id', v_club.id,
      'slug', v_club.slug,
      'publicName', v_club.public_name,
      'officialName', v_club.official_name,
      'competitionLevel', v_club.competition_level,
      'voivodeship', v_club.voivodeship
    ),
    'settings', jsonb_build_object(
      'logoPath', v_settings.logo_path,
      'logoDarkPath', v_settings.logo_dark_path,
      'primaryColor', v_settings.primary_color,
      'secondaryColor', v_settings.secondary_color,
      'accentColor', v_settings.accent_color,
      'heroImagePath', v_settings.hero_image_path,
      'heroTitle', COALESCE(v_settings.hero_title, v_club.public_name),
      'heroSubtitle', v_settings.hero_subtitle,
      'seoTitle', v_settings.seo_title,
      'seoDescription', v_settings.seo_description,
      'contactAddress', v_settings.contact_address,
      'contactEmail', v_settings.contact_email,
      'contactPhone', v_settings.contact_phone
    ),
    'nextMatch', v_next_match,
    'lastResult', v_last_result,
    'newsCount', (SELECT COUNT(*)::INTEGER FROM public.website_news n WHERE n.club_id = v_club_id AND n.status = 'published'),
    'sponsorCount', (SELECT COUNT(*)::INTEGER FROM public.sponsors s WHERE s.club_id = v_club_id AND s.show_on_website = TRUE)
  );
END;
$$;
