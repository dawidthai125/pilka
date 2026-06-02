-- Public Website 3.0 — media system (greenfield-safe: after coach_team_ids @ 20260605110000)

DO $$
BEGIN
  CREATE TYPE public.website_media_section AS ENUM (
    'hero',
    'team',
    'academy',
    'gallery',
    'news'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.website_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  section public.website_media_section NOT NULL,
  slot_key TEXT NOT NULL DEFAULT 'default',
  team_id UUID REFERENCES public.teams (id) ON DELETE CASCADE,
  news_id UUID REFERENCES public.website_news (id) ON DELETE CASCADE,
  storage_path TEXT,
  demo_asset_key TEXT,
  caption TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT website_media_has_source CHECK (storage_path IS NOT NULL OR demo_asset_key IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_website_media_club_section
  ON public.website_media (club_id, section, sort_order);

CREATE INDEX IF NOT EXISTS idx_website_media_team
  ON public.website_media (club_id, team_id)
  WHERE team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_website_media_news
  ON public.website_media (club_id, news_id)
  WHERE news_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_hero_slot
  ON public.website_media (club_id, slot_key)
  WHERE section = 'hero';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_team
  ON public.website_media (club_id, team_id)
  WHERE section = 'team';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_academy_slot
  ON public.website_media (club_id, slot_key)
  WHERE section = 'academy';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_gallery_slot
  ON public.website_media (club_id, slot_key)
  WHERE section = 'gallery';

CREATE UNIQUE INDEX IF NOT EXISTS uq_website_media_news
  ON public.website_media (club_id, news_id)
  WHERE section = 'news';

DROP TRIGGER IF EXISTS website_media_set_updated_at ON public.website_media;
CREATE TRIGGER website_media_set_updated_at
  BEFORE UPDATE ON public.website_media
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.actor_can_manage_website_media(
  p_club_id UUID,
  p_section public.website_media_section,
  p_team_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN public.actor_can_manage_website(p_club_id) THEN TRUE
    WHEN p_section = 'team'
      AND p_team_id IS NOT NULL
      AND p_team_id IN (SELECT public.coach_team_ids(p_club_id)) THEN TRUE
    ELSE FALSE
  END;
$$;

-- Legacy hero_image_path → website_media (slot hero/team). Idempotent, preserves uploads.
INSERT INTO public.website_media (club_id, section, slot_key, storage_path, sort_order, caption)
SELECT
  ws.club_id,
  'hero'::public.website_media_section,
  'team',
  ws.hero_image_path,
  1,
  'Zdjęcie hero'
FROM public.website_settings ws
WHERE ws.hero_image_path IS NOT NULL
ON CONFLICT (club_id, slot_key) WHERE (section = 'hero')
DO UPDATE SET
  storage_path = COALESCE(website_media.storage_path, EXCLUDED.storage_path),
  updated_at = timezone('utc', now());

ALTER TABLE public.website_media ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "website_media_staff_select" ON public.website_media;
CREATE POLICY "website_media_staff_select" ON public.website_media
  FOR SELECT TO authenticated
  USING (public.actor_can_read_website_cms(club_id));

DROP POLICY IF EXISTS "website_media_public_select" ON public.website_media;
CREATE POLICY "website_media_public_select" ON public.website_media
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE AND public.website_is_public(club_id));

DROP POLICY IF EXISTS "website_media_insert" ON public.website_media;
CREATE POLICY "website_media_insert" ON public.website_media
  FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_website_media(club_id, section, team_id));

DROP POLICY IF EXISTS "website_media_update" ON public.website_media;
CREATE POLICY "website_media_update" ON public.website_media
  FOR UPDATE TO authenticated
  USING (public.actor_can_manage_website_media(club_id, section, team_id))
  WITH CHECK (public.actor_can_manage_website_media(club_id, section, team_id));

DROP POLICY IF EXISTS "website_media_delete" ON public.website_media;
CREATE POLICY "website_media_delete" ON public.website_media
  FOR DELETE TO authenticated
  USING (public.actor_can_manage_website_media(club_id, section, team_id));

DROP POLICY IF EXISTS "club_assets_website_media_coach_insert" ON storage.objects;
CREATE POLICY "club_assets_website_media_coach_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[3] = 'media'
    AND (storage.foldername(name))[4] = 'team'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website_media(
      (storage.foldername(name))[1]::uuid,
      'team'::public.website_media_section,
      (storage.foldername(name))[5]::uuid
    )
  );

DROP POLICY IF EXISTS "club_assets_website_media_coach_update" ON storage.objects;
CREATE POLICY "club_assets_website_media_coach_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[3] = 'media'
    AND (storage.foldername(name))[4] = 'team'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website_media(
      (storage.foldername(name))[1]::uuid,
      'team'::public.website_media_section,
      (storage.foldername(name))[5]::uuid
    )
  );

DROP POLICY IF EXISTS "club_assets_website_media_coach_delete" ON storage.objects;
CREATE POLICY "club_assets_website_media_coach_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND (storage.foldername(name))[2] = 'website'
    AND (storage.foldername(name))[3] = 'media'
    AND (storage.foldername(name))[4] = 'team'
    AND (storage.foldername(name))[1]::uuid IN (SELECT public.user_club_ids())
    AND public.actor_can_manage_website_media(
      (storage.foldername(name))[1]::uuid,
      'team'::public.website_media_section,
      (storage.foldername(name))[5]::uuid
    )
  );

GRANT SELECT ON public.website_media TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.website_media TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_website_media(UUID, public.website_media_section, UUID) TO authenticated;
