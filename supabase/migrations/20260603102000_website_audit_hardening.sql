-- ETAP 9 audit: RLS, CMS, wydajność, SEO (sitemap RPC)

-- ---------------------------------------------------------------------------
-- CMS: trener nie może opublikować wpisu (defense-in-depth)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_website_news_publish_role()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT public.actor_can_publish_website_news(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient privileges to publish website news';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS website_news_enforce_publish ON public.website_news;
CREATE TRIGGER website_news_enforce_publish
  BEFORE INSERT OR UPDATE OF status ON public.website_news
  FOR EACH ROW EXECUTE FUNCTION public.enforce_website_news_publish_role();

-- Spójność club_id: zdjęcia galerii
CREATE OR REPLACE FUNCTION public.enforce_website_gallery_photo_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.website_gallery_albums a
    WHERE a.id = NEW.album_id AND a.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'album_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS website_gallery_photos_enforce_club ON public.website_gallery_photos;
CREATE TRIGGER website_gallery_photos_enforce_club
  BEFORE INSERT OR UPDATE OF album_id, club_id ON public.website_gallery_photos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_website_gallery_photo_club_consistency();

-- ---------------------------------------------------------------------------
-- Public data: usuń szeroki SELECT (wyciek PII) — zastąp RPC
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "players_public_select" ON public.players;
DROP POLICY IF EXISTS "player_stats_public_select" ON public.player_stats;
DROP POLICY IF EXISTS "sponsors_public_select" ON public.sponsors;

CREATE OR REPLACE FUNCTION public.get_public_players(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(row ORDER BY jersey_number NULLS LAST, last_name), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', p.id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'jerseyNumber', p.jersey_number,
      'position', p.primary_position,
      'goals', COALESCE(SUM(ps.goals), 0),
      'assists', COALESCE(SUM(ps.assists), 0),
      'matchesPlayed', COALESCE(SUM(ps.matches_played), 0)
    ) AS row,
    p.jersey_number,
    p.last_name
    FROM public.clubs c
    JOIN public.players p ON p.club_id = c.id AND p.status = 'active'
    LEFT JOIN public.player_stats ps ON ps.player_id = p.id AND ps.club_id = c.id
    WHERE c.slug = p_club_slug
      AND c.status = 'active'
      AND public.website_is_public(c.id)
    GROUP BY p.id, p.first_name, p.last_name, p.jersey_number, p.primary_position
  ) sub;
$$;

CREATE OR REPLACE FUNCTION public.get_public_sponsors(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
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
  FROM public.clubs c
  JOIN public.sponsors s ON s.club_id = c.id
  WHERE c.slug = p_club_slug
    AND c.status = 'active'
    AND public.website_is_public(c.id)
    AND s.show_on_website = TRUE
    AND s.cooperation_status IN ('active', 'expiring');
$$;

CREATE OR REPLACE FUNCTION public.get_public_website_sitemap(p_club_slug TEXT)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'news', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slug', n.slug, 'updatedAt', n.updated_at))
      FROM public.website_news n
      JOIN public.clubs c ON c.id = n.club_id
      WHERE c.slug = p_club_slug AND n.status = 'published' AND public.website_is_public(c.id)
    ), '[]'::jsonb),
    'gallery', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('slug', a.slug, 'updatedAt', a.updated_at))
      FROM public.website_gallery_albums a
      JOIN public.clubs c ON c.id = a.club_id
      WHERE c.slug = p_club_slug AND a.is_published = TRUE AND public.website_is_public(c.id)
    ), '[]'::jsonb)
  )
  FROM public.clubs c
  WHERE c.slug = p_club_slug AND public.website_is_public(c.id);
$$;

GRANT EXECUTE ON FUNCTION public.get_public_players(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_sponsors(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_website_sitemap(TEXT) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_website_gallery_photos_club
  ON public.website_gallery_photos (club_id, album_id);

CREATE INDEX IF NOT EXISTS idx_website_news_published
  ON public.website_news (club_id, published_at DESC)
  WHERE status = 'published';

-- Wzmocnienie helperów RLS (wymóg user_club_ids)
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
      ARRAY['owner','president','website_admin','coach']::public.club_role[]
    );
$$;

-- Dyrektor sportowy nie zarządza CMS (zgodnie ze specyfikacją ETAP 9)
DROP POLICY IF EXISTS "website_news_staff_select" ON public.website_news;
CREATE POLICY "website_news_staff_select" ON public.website_news FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));
