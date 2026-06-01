-- ETAP 14: AI Video Analysis — Video Center

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'scout';

CREATE TYPE public.video_category AS ENUM (
  'match',
  'training',
  'opponent_analysis',
  'educational'
);

CREATE TYPE public.video_job_status AS ENUM (
  'pending',
  'processing',
  'ready',
  'error'
);

CREATE TYPE public.video_report_type AS ENUM (
  'match',
  'training',
  'opponent'
);

CREATE TYPE public.video_event_type AS ENUM (
  'goal',
  'chance',
  'foul',
  'corner',
  'free_kick',
  'card',
  'substitution'
);

CREATE TYPE public.video_event_source AS ENUM (
  'manual',
  'ai_suggested',
  'ai_confirmed'
);

CREATE TYPE public.video_news_draft_status AS ENUM (
  'pending_approval',
  'approved',
  'rejected'
);

CREATE TYPE public.video_clip_category AS ENUM (
  'goal',
  'offensive',
  'defensive',
  'custom'
);

CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  title TEXT NOT NULL,
  description TEXT,
  category public.video_category NOT NULL DEFAULT 'match',
  storage_path TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  duration_seconds INTEGER,
  thumbnail_url TEXT,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  training_id UUID REFERENCES public.trainings (id) ON DELETE SET NULL,
  opponent_name TEXT,
  job_status public.video_job_status NOT NULL DEFAULT 'pending',
  job_error TEXT,
  view_count INTEGER NOT NULL DEFAULT 0,
  is_public_within_club BOOLEAN NOT NULL DEFAULT FALSE,
  recorded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  status public.video_job_status NOT NULL DEFAULT 'pending',
  step TEXT NOT NULL DEFAULT 'queued',
  progress_percent INTEGER NOT NULL DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  report_type public.video_report_type NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  strengths JSONB NOT NULL DEFAULT '[]'::jsonb,
  weaknesses JSONB NOT NULL DEFAULT '[]'::jsonb,
  key_moments JSONB NOT NULL DEFAULT '[]'::jsonb,
  coaching_recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  extra_sections JSONB NOT NULL DEFAULT '{}'::jsonb,
  generated_by_ai BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  event_type public.video_event_type NOT NULL,
  source public.video_event_source NOT NULL DEFAULT 'manual',
  timestamp_seconds INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  label TEXT,
  description TEXT,
  player_name TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  timestamp_seconds INTEGER NOT NULL CHECK (timestamp_seconds >= 0),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category public.video_clip_category NOT NULL DEFAULT 'custom',
  start_seconds INTEGER NOT NULL CHECK (start_seconds >= 0),
  end_seconds INTEGER NOT NULL CHECK (end_seconds > start_seconds),
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.video_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  shared_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  note TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (video_id, shared_with_user_id)
);

CREATE TABLE public.video_news_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES public.videos (id) ON DELETE CASCADE,
  report_id UUID REFERENCES public.video_reports (id) ON DELETE SET NULL,
  draft_type TEXT NOT NULL CHECK (draft_type IN ('club_news', 'facebook_post', 'match_summary')),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status public.video_news_draft_status NOT NULL DEFAULT 'pending_approval',
  approved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX videos_club_category_idx ON public.videos (club_id, category, created_at DESC);
CREATE INDEX videos_club_status_idx ON public.videos (club_id, job_status);
CREATE INDEX video_jobs_video_idx ON public.video_jobs (video_id, created_at DESC);
CREATE INDEX video_reports_video_idx ON public.video_reports (video_id);
CREATE INDEX video_events_video_ts_idx ON public.video_events (video_id, timestamp_seconds);
CREATE INDEX video_notes_video_idx ON public.video_notes (video_id, timestamp_seconds);
CREATE INDEX video_clips_video_idx ON public.video_clips (video_id);
CREATE INDEX video_shares_user_idx ON public.video_shares (shared_with_user_id, club_id);
CREATE INDEX video_news_drafts_status_idx ON public.video_news_drafts (club_id, status);

CREATE TRIGGER videos_set_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_jobs_set_updated_at
  BEFORE UPDATE ON public.video_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_reports_set_updated_at
  BEFORE UPDATE ON public.video_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_events_set_updated_at
  BEFORE UPDATE ON public.video_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_notes_set_updated_at
  BEFORE UPDATE ON public.video_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_clips_set_updated_at
  BEFORE UPDATE ON public.video_clips
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER video_news_drafts_set_updated_at
  BEFORE UPDATE ON public.video_news_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_videos(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_videos(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.user_has_club_role(
        p_club_id,
        ARRAY['owner','president','coach','scout']::public.club_role[]
      )
      OR EXISTS (
        SELECT 1 FROM public.video_shares vs
        WHERE vs.club_id = p_club_id
          AND vs.shared_with_user_id = auth.uid()
          AND (vs.expires_at IS NULL OR vs.expires_at > NOW())
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_video_row(p_video_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.id = p_video_id
      AND public.actor_can_read_videos(v.club_id)
      AND (
        public.actor_can_manage_videos(v.club_id)
        OR public.user_has_club_role(
          v.club_id,
          ARRAY['owner','president','coach','scout']::public.club_role[]
        )
        OR EXISTS (
          SELECT 1 FROM public.video_shares vs
          WHERE vs.video_id = v.id
            AND vs.shared_with_user_id = auth.uid()
            AND (vs.expires_at IS NULL OR vs.expires_at > NOW())
        )
      )
  );
$$;

-- RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_news_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY videos_select ON public.videos FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(id));

CREATE POLICY videos_manage ON public.videos FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_jobs_select ON public.video_jobs FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_jobs_manage ON public.video_jobs FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_reports_select ON public.video_reports FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_reports_manage ON public.video_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_events_select ON public.video_events FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_events_manage ON public.video_events FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_notes_select ON public.video_notes FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_notes_manage ON public.video_notes FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_clips_select ON public.video_clips FOR SELECT TO authenticated
  USING (public.actor_can_access_video_row(video_id));

CREATE POLICY video_clips_manage ON public.video_clips FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_shares_select ON public.video_shares FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_videos(club_id)
    OR shared_with_user_id = auth.uid()
  );

CREATE POLICY video_shares_manage ON public.video_shares FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

CREATE POLICY video_news_drafts_select ON public.video_news_drafts FOR SELECT TO authenticated
  USING (public.actor_can_read_videos(club_id));

CREATE POLICY video_news_drafts_manage ON public.video_news_drafts FOR ALL TO authenticated
  USING (public.actor_can_manage_videos(club_id))
  WITH CHECK (public.actor_can_manage_videos(club_id));

-- Storage bucket for club videos (default 500 MB per file — configurable in app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'club-videos',
  'club-videos',
  FALSE,
  524288000,
  ARRAY[
    'video/mp4',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE OR REPLACE FUNCTION public.storage_video_club_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 1), '')::UUID;
$$;

CREATE POLICY club_videos_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_read_videos(public.storage_video_club_id_from_path(name))
  );

CREATE POLICY club_videos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  );

CREATE POLICY club_videos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  );

CREATE POLICY club_videos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.videos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_jobs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_clips TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_shares TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.video_news_drafts TO authenticated;
