-- ETAP 9: Strona publiczna klubu, CMS, panel kibica

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'website_admin';

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'website';

CREATE TYPE public.website_news_category AS ENUM (
  'matches',
  'club',
  'transfers',
  'academy',
  'sponsors',
  'other'
);

CREATE TYPE public.website_news_status AS ENUM (
  'draft',
  'pending_review',
  'published',
  'archived'
);

CREATE TYPE public.website_gallery_category AS ENUM (
  'matches',
  'trainings',
  'club',
  'events'
);

CREATE TYPE public.website_sponsor_tier AS ENUM (
  'main',
  'supporting',
  'partner'
);

CREATE TYPE public.website_social_platform AS ENUM (
  'facebook',
  'instagram',
  'tiktok',
  'youtube'
);

-- Rozszerzenie sponsorów o widoczność publiczną (bez przebudowy modułu CRM)
ALTER TABLE public.sponsors
  ADD COLUMN IF NOT EXISTS show_on_website BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS public_tier public.website_sponsor_tier,
  ADD COLUMN IF NOT EXISTS public_description TEXT;

-- ---------------------------------------------------------------------------
-- Ustawienia strony i branding
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_settings (
  club_id UUID PRIMARY KEY REFERENCES public.clubs (id) ON DELETE CASCADE,
  public_site_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  logo_path TEXT,
  logo_dark_path TEXT,
  primary_color TEXT NOT NULL DEFAULT '#1e3a5f',
  secondary_color TEXT NOT NULL DEFAULT '#f5c518',
  accent_color TEXT NOT NULL DEFAULT '#ffffff',
  hero_image_path TEXT,
  hero_title TEXT,
  hero_subtitle TEXT,
  contact_address TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  google_maps_embed_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  og_image_path TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER website_settings_set_updated_at
  BEFORE UPDATE ON public.website_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Aktualności (CMS)
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  featured_image_path TEXT,
  content TEXT NOT NULL DEFAULT '',
  category public.website_news_category NOT NULL DEFAULT 'club',
  status public.website_news_status NOT NULL DEFAULT 'draft',
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ai_source_report_id UUID REFERENCES public.ai_reports (id) ON DELETE SET NULL,
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE INDEX idx_website_news_club_status ON public.website_news (club_id, status, published_at DESC);
CREATE INDEX idx_website_news_category ON public.website_news (club_id, category, status);

CREATE TRIGGER website_news_set_updated_at
  BEFORE UPDATE ON public.website_news
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Galeria
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_gallery_albums (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category public.website_gallery_category NOT NULL DEFAULT 'club',
  cover_image_path TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE INDEX idx_website_gallery_albums_club ON public.website_gallery_albums (club_id, is_published, sort_order);

CREATE TRIGGER website_gallery_albums_set_updated_at
  BEFORE UPDATE ON public.website_gallery_albums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.website_gallery_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  album_id UUID NOT NULL REFERENCES public.website_gallery_albums (id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_website_gallery_photos_album ON public.website_gallery_photos (album_id, sort_order);

-- ---------------------------------------------------------------------------
-- Integracje social media (architektura pod przyszłe API)
-- ---------------------------------------------------------------------------

CREATE TABLE public.website_social_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  platform public.website_social_platform NOT NULL,
  profile_url TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  api_connected BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMPTZ,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, platform)
);

CREATE TRIGGER website_social_integrations_set_updated_at
  BEFORE UPDATE ON public.website_social_integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.website_is_public(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ws.public_site_enabled FROM public.website_settings ws WHERE ws.club_id = p_club_id),
    FALSE
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_website(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_website_cms(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_create_website_news(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','website_admin','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_publish_website_news(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_website(p_club_id);
$$;

-- ---------------------------------------------------------------------------
-- RLS policies — CMS tables
-- ---------------------------------------------------------------------------

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_news ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_gallery_albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_gallery_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_social_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "website_settings_select" ON public.website_settings FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id) OR public.website_is_public(club_id));

CREATE POLICY "website_settings_manage" ON public.website_settings FOR ALL TO authenticated
  USING (public.actor_can_manage_website(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

CREATE POLICY "website_settings_public_select" ON public.website_settings FOR SELECT TO anon
  USING (public.website_is_public(club_id));

CREATE POLICY "website_news_staff_select" ON public.website_news FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));

CREATE POLICY "website_news_staff_insert" ON public.website_news FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_website_news(club_id));

CREATE POLICY "website_news_staff_update" ON public.website_news FOR UPDATE TO authenticated
  USING (public.actor_can_create_website_news(club_id))
  WITH CHECK (public.actor_can_create_website_news(club_id));

CREATE POLICY "website_news_staff_delete" ON public.website_news FOR DELETE TO authenticated
  USING (public.actor_can_manage_website(club_id));

CREATE POLICY "website_news_public_select" ON public.website_news FOR SELECT TO anon, authenticated
  USING (status = 'published' AND public.website_is_public(club_id));

CREATE POLICY "website_gallery_albums_staff" ON public.website_gallery_albums FOR ALL TO authenticated
  USING (public.actor_can_read_website_cms(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

CREATE POLICY "website_gallery_albums_public_select" ON public.website_gallery_albums FOR SELECT TO anon, authenticated
  USING (is_published = TRUE AND public.website_is_public(club_id));

CREATE POLICY "website_gallery_photos_staff" ON public.website_gallery_photos FOR ALL TO authenticated
  USING (public.actor_can_read_website_cms(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

CREATE POLICY "website_gallery_photos_public_select" ON public.website_gallery_photos FOR SELECT TO anon, authenticated
  USING (
    public.website_is_public(club_id)
    AND EXISTS (
      SELECT 1 FROM public.website_gallery_albums a
      WHERE a.id = album_id AND a.is_published = TRUE
    )
  );

CREATE POLICY "website_social_staff_select" ON public.website_social_integrations FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));

CREATE POLICY "website_social_staff_manage" ON public.website_social_integrations FOR ALL TO authenticated
  USING (public.actor_can_manage_website(club_id))
  WITH CHECK (public.actor_can_manage_website(club_id));

-- ---------------------------------------------------------------------------
-- Public read on existing modules (matches, league, players, sponsors)
-- ---------------------------------------------------------------------------

CREATE POLICY "matches_public_select" ON public.matches FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id));

CREATE POLICY "league_table_public_select" ON public.league_table_entries FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id));

CREATE POLICY "players_public_select" ON public.players FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id) AND status = 'active');

CREATE POLICY "player_stats_public_select" ON public.player_stats FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id));

CREATE POLICY "match_events_public_select" ON public.match_events FOR SELECT TO anon, authenticated
  USING (
    public.website_is_public(club_id)
    AND EXISTS (SELECT 1 FROM public.matches m WHERE m.id = match_id AND m.status = 'completed')
  );

CREATE POLICY "sponsors_public_select" ON public.sponsors FOR SELECT TO anon, authenticated
  USING (
    public.website_is_public(club_id)
    AND show_on_website = TRUE
    AND cooperation_status IN ('active', 'expiring')
  );

CREATE POLICY "clubs_public_select" ON public.clubs FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.website_settings ws
      WHERE ws.club_id = clubs.id AND ws.public_site_enabled = TRUE
    )
  );

CREATE POLICY "teams_public_select" ON public.teams FOR SELECT TO anon, authenticated
  USING (public.website_is_public(club_id) AND is_active = TRUE);

-- ---------------------------------------------------------------------------
-- Storage — public read for website assets
-- ---------------------------------------------------------------------------

CREATE POLICY "club_assets_website_public_read" ON storage.objects FOR SELECT TO anon, authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
  );

CREATE POLICY "club_assets_website_staff_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "club_assets_website_staff_update" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website((storage.foldername(name))[1]::uuid)
  );

CREATE POLICY "club_assets_website_staff_delete" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website((storage.foldername(name))[1]::uuid)
  );

-- ---------------------------------------------------------------------------
-- RPC — agregaty strony głównej (wydajność)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_public_website_home(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_club_id UUID;
  v_club RECORD;
  v_settings RECORD;
  v_next_match JSONB;
  v_last_result JSONB;
BEGIN
  SELECT c.id, c.slug, c.public_name, c.official_name, c.competition_level, c.voivodeship
  INTO v_club
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND c.status = 'active';

  IF v_club.id IS NULL OR NOT public.website_is_public(v_club.id) THEN
    RETURN NULL;
  END IF;

  v_club_id := v_club.id;

  SELECT * INTO v_settings FROM public.website_settings ws WHERE ws.club_id = v_club_id;

  SELECT jsonb_build_object(
    'id', m.id,
    'matchDate', m.match_date,
    'matchTime', m.match_time,
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'stadium', m.stadium,
    'competition', m.competition,
    'roundNumber', m.round_number
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
    'homeTeamName', m.home_team_name,
    'awayTeamName', m.away_team_name,
    'homeScore', m.home_score,
    'awayScore', m.away_score,
    'competition', m.competition
  ) INTO v_last_result
  FROM public.matches m
  WHERE m.club_id = v_club_id AND m.status = 'completed'
  ORDER BY m.match_date DESC, m.match_time DESC
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

CREATE OR REPLACE FUNCTION public.get_public_team_stats(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'playersCount', COUNT(DISTINCT p.id)::INTEGER,
    'goals', COALESCE(SUM(ps.goals), 0)::INTEGER,
    'assists', COALESCE(SUM(ps.assists), 0)::INTEGER,
    'matchesPlayed', COALESCE(SUM(ps.matches_played), 0)::INTEGER
  )
  FROM public.clubs c
  JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
  LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id)
  GROUP BY c.id;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_website_home(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_team_stats(TEXT) TO anon, authenticated;
GRANT SELECT ON public.website_settings TO anon, authenticated;
GRANT SELECT ON public.website_news TO anon, authenticated;
GRANT SELECT ON public.website_gallery_albums TO anon, authenticated;
GRANT SELECT ON public.website_gallery_photos TO anon, authenticated;
