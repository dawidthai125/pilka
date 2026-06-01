-- ETAP 15A: Content Hub — centralny system publikacji treści

CREATE TYPE public.content_type AS ENUM (
  'news',
  'match_report',
  'match_preview',
  'round_summary',
  'sponsor_post',
  'anniversary_post',
  'club_announcement',
  'photo_gallery',
  'ai_report'
);

CREATE TYPE public.content_status AS ENUM (
  'draft',
  'pending_approval',
  'approved',
  'published',
  'rejected'
);

CREATE TYPE public.content_channel AS ENUM (
  'website',
  'facebook',
  'instagram',
  'sponsor',
  'club_announcement'
);

CREATE TYPE public.content_channel_status AS ENUM (
  'draft',
  'queued',
  'approved',
  'published'
);

CREATE TYPE public.content_approval_action AS ENUM (
  'submitted',
  'approved',
  'rejected',
  'published'
);

CREATE TYPE public.content_asset_type AS ENUM (
  'photo',
  'graphic',
  'video_clip'
);

CREATE TYPE public.content_ai_source AS ENUM (
  'manual',
  'agent',
  'generator',
  'video',
  'match'
);

CREATE TABLE public.content_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  content_type public.content_type NOT NULL,
  status public.content_status NOT NULL DEFAULT 'draft',
  title TEXT NOT NULL,
  slug TEXT,
  summary TEXT,
  body_website TEXT,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  video_id UUID REFERENCES public.videos (id) ON DELETE SET NULL,
  video_report_id UUID REFERENCES public.video_reports (id) ON DELETE SET NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  website_news_id UUID REFERENCES public.website_news (id) ON DELETE SET NULL,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  rejected_at TIMESTAMPTZ,
  rejection_note TEXT,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE TABLE public.content_channel_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.content_posts (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  channel public.content_channel NOT NULL,
  title TEXT,
  body TEXT NOT NULL DEFAULT '',
  status public.content_channel_status NOT NULL DEFAULT 'draft',
  queue_position INTEGER NOT NULL DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (post_id, channel)
);

CREATE TABLE public.content_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  channel public.content_channel NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  auto_queue BOOLEAN NOT NULL DEFAULT FALSE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, channel)
);

CREATE TABLE public.content_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.content_posts (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  channel_variant_id UUID REFERENCES public.content_channel_variants (id) ON DELETE SET NULL,
  action public.content_approval_action NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.content_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.content_posts (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ NOT NULL,
  all_day BOOLEAN NOT NULL DEFAULT FALSE,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.content_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.content_posts (id) ON DELETE SET NULL,
  asset_type public.content_asset_type NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  video_id UUID REFERENCES public.videos (id) ON DELETE SET NULL,
  video_clip_id UUID REFERENCES public.video_clips (id) ON DELETE SET NULL,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.content_ai_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.content_posts (id) ON DELETE SET NULL,
  generation_type TEXT NOT NULL,
  prompt_summary TEXT NOT NULL,
  model TEXT,
  source public.content_ai_source NOT NULL DEFAULT 'manual',
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX content_posts_club_status_idx ON public.content_posts (club_id, status, created_at DESC);
CREATE INDEX content_posts_club_type_idx ON public.content_posts (club_id, content_type);
CREATE INDEX content_posts_scheduled_idx ON public.content_posts (club_id, scheduled_at);
CREATE INDEX content_posts_sponsor_idx ON public.content_posts (sponsor_id) WHERE sponsor_id IS NOT NULL;
CREATE INDEX content_channel_variants_queue_idx ON public.content_channel_variants (club_id, channel, status, queue_position);
CREATE INDEX content_calendar_scheduled_idx ON public.content_calendar (club_id, scheduled_at);
CREATE INDEX content_assets_club_idx ON public.content_assets (club_id, asset_type, created_at DESC);
CREATE INDEX content_approvals_post_idx ON public.content_approvals (post_id, created_at DESC);
CREATE INDEX content_ai_generations_club_idx ON public.content_ai_generations (club_id, created_at DESC);

CREATE TRIGGER content_posts_set_updated_at
  BEFORE UPDATE ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_channel_variants_set_updated_at
  BEFORE UPDATE ON public.content_channel_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_channels_set_updated_at
  BEFORE UPDATE ON public.content_channels
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_calendar_set_updated_at
  BEFORE UPDATE ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER content_assets_set_updated_at
  BEFORE UPDATE ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_content(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_create_content(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_content(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_create_content(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['sponsor']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_publish_content(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_content(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_content_post(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.content_posts cp
    WHERE cp.id = p_post_id
      AND cp.club_id IN (SELECT public.user_club_ids())
      AND (
        public.actor_can_create_content(cp.club_id)
        OR (
          public.actor_is_sponsor_user(cp.club_id)
          AND cp.sponsor_id IS NOT NULL
          AND cp.sponsor_id = public.sponsor_id_for_user(cp.club_id, auth.uid())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_post_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.content_posts cp
    WHERE cp.id = NEW.post_id AND cp.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'post_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_publish_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Seed/migracje (brak auth.uid())
  IF auth.uid() IS NULL THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' AND OLD.status IS DISTINCT FROM 'published' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to publish content';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to approve content';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_posts_enforce_publish ON public.content_posts;
CREATE TRIGGER content_posts_enforce_publish
  BEFORE INSERT OR UPDATE OF status, published_at ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_publish_role();

DROP TRIGGER IF EXISTS content_channel_variants_enforce_club ON public.content_channel_variants;
CREATE TRIGGER content_channel_variants_enforce_club
  BEFORE INSERT OR UPDATE OF post_id, club_id ON public.content_channel_variants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_child_club_consistency();

DROP TRIGGER IF EXISTS content_approvals_enforce_club ON public.content_approvals;
CREATE TRIGGER content_approvals_enforce_club
  BEFORE INSERT OR UPDATE OF post_id, club_id ON public.content_approvals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_child_club_consistency();

DROP TRIGGER IF EXISTS content_calendar_enforce_club ON public.content_calendar;
CREATE TRIGGER content_calendar_enforce_club
  BEFORE INSERT OR UPDATE OF post_id, club_id ON public.content_calendar
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_child_club_consistency();

-- RLS
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_channel_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY content_posts_select ON public.content_posts FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(id));

CREATE POLICY content_posts_insert ON public.content_posts FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_posts_update ON public.content_posts FOR UPDATE TO authenticated
  USING (public.actor_can_access_content_post(id))
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      public.actor_can_publish_content(club_id)
      OR status IN ('draft', 'pending_approval')
    )
  );

CREATE POLICY content_posts_delete ON public.content_posts FOR DELETE TO authenticated
  USING (public.actor_can_manage_content(club_id));

CREATE POLICY content_channel_variants_select ON public.content_channel_variants FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(post_id));

CREATE POLICY content_channel_variants_manage ON public.content_channel_variants FOR ALL TO authenticated
  USING (public.actor_can_create_content(club_id))
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_channels_select ON public.content_channels FOR SELECT TO authenticated
  USING (public.actor_can_read_content(club_id));

CREATE POLICY content_channels_manage ON public.content_channels FOR ALL TO authenticated
  USING (public.actor_can_manage_content(club_id))
  WITH CHECK (public.actor_can_manage_content(club_id));

CREATE POLICY content_approvals_select ON public.content_approvals FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(post_id));

CREATE POLICY content_approvals_insert ON public.content_approvals FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_calendar_select ON public.content_calendar FOR SELECT TO authenticated
  USING (public.actor_can_access_content_post(post_id));

CREATE POLICY content_calendar_manage ON public.content_calendar FOR ALL TO authenticated
  USING (public.actor_can_create_content(club_id))
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_assets_select ON public.content_assets FOR SELECT TO authenticated
  USING (
    public.actor_can_read_content(club_id)
    AND (
      public.actor_can_create_content(club_id)
      OR post_id IS NULL
    )
  );

CREATE POLICY content_assets_manage ON public.content_assets FOR ALL TO authenticated
  USING (public.actor_can_create_content(club_id))
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_ai_generations_select ON public.content_ai_generations FOR SELECT TO authenticated
  USING (public.actor_can_read_content(club_id));

CREATE POLICY content_ai_generations_insert ON public.content_ai_generations FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

-- Storage path: club-assets/{clubId}/content/...
CREATE OR REPLACE FUNCTION public.storage_is_club_content_asset_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql IMMUTABLE
AS $$
  SELECT object_name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/content/'
  )
  AND position('..' IN object_name) = 0;
$$;

CREATE POLICY club_content_assets_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_content(public.storage_club_id_from_path(name))
  );

CREATE POLICY club_content_assets_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_create_content(public.storage_club_id_from_path(name))
  );

CREATE POLICY club_content_assets_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_create_content(public.storage_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_create_content(public.storage_club_id_from_path(name))
  );

CREATE POLICY club_content_assets_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND public.storage_is_club_content_asset_path(name)
    AND public.actor_can_manage_content(public.storage_club_id_from_path(name))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_channel_variants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_channels TO authenticated;
GRANT SELECT, INSERT ON public.content_approvals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_calendar TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.content_assets TO authenticated;
GRANT SELECT, INSERT ON public.content_ai_generations TO authenticated;

-- Default channels per club (existing clubs)
INSERT INTO public.content_channels (club_id, channel, is_enabled, auto_queue)
SELECT c.id, ch.channel, TRUE, FALSE
FROM public.clubs c
CROSS JOIN (
  VALUES
    ('website'::public.content_channel),
    ('facebook'::public.content_channel),
    ('instagram'::public.content_channel),
    ('sponsor'::public.content_channel),
    ('club_announcement'::public.content_channel)
) AS ch(channel)
ON CONFLICT (club_id, channel) DO NOTHING;
