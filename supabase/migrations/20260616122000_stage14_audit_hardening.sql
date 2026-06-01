-- ETAP 14 audit: RLS, storage per-video, spójność club_id, udostępniania

CREATE OR REPLACE FUNCTION public.storage_is_club_video_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT object_name ~ (
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/videos/'
    || '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
  )
  AND position('..' IN object_name) = 0;
$$;

CREATE OR REPLACE FUNCTION public.storage_video_id_from_path(object_name TEXT)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(split_part(object_name, '/', 3), '')::UUID;
$$;

-- Odczyt klubowy tylko dla sztabu (bez eskalacji przez pojedynczy share)
CREATE OR REPLACE FUNCTION public.actor_can_read_videos(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_video_row(p_video_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = p_video_id
      AND v.club_id IN (SELECT public.user_club_ids())
      AND (
        public.user_has_club_role(
          v.club_id,
          ARRAY['owner','president','coach','scout']::public.club_role[]
        )
        OR EXISTS (
          SELECT 1
          FROM public.video_shares vs
          WHERE vs.video_id = v.id
            AND vs.shared_with_user_id = auth.uid()
            AND (vs.expires_at IS NULL OR vs.expires_at > NOW())
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_video_storage_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.storage_is_club_video_path(object_name)
    AND public.actor_can_access_video_row(public.storage_video_id_from_path(object_name));
$$;

CREATE OR REPLACE FUNCTION public.actor_can_upload_video_storage_path(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.storage_is_club_video_path(object_name)
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(object_name))
    AND EXISTS (
      SELECT 1
      FROM public.videos v
      WHERE v.id = public.storage_video_id_from_path(object_name)
        AND v.club_id = public.storage_video_club_id_from_path(object_name)
    );
$$;

CREATE OR REPLACE FUNCTION public.enforce_video_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.videos v
    WHERE v.id = NEW.video_id
      AND v.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'video_id does not belong to club_id';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_video_storage_path_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.storage_path IS NOT NULL THEN
    IF NOT public.storage_is_club_video_path(NEW.storage_path) THEN
      RAISE EXCEPTION 'invalid storage_path format';
    END IF;

    IF public.storage_video_club_id_from_path(NEW.storage_path) IS DISTINCT FROM NEW.club_id THEN
      RAISE EXCEPTION 'storage_path club_id mismatch';
    END IF;

    IF public.storage_video_id_from_path(NEW.storage_path) IS DISTINCT FROM NEW.id THEN
      RAISE EXCEPTION 'storage_path video_id mismatch';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_video_share_recipient()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.club_memberships cm
    WHERE cm.club_id = NEW.club_id
      AND cm.user_id = NEW.shared_with_user_id
      AND cm.status = 'active'
  ) THEN
    RAISE EXCEPTION 'shared_with_user_id is not an active club member';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS videos_enforce_storage_path ON public.videos;
CREATE TRIGGER videos_enforce_storage_path
  BEFORE INSERT OR UPDATE OF storage_path, club_id, id ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_storage_path_consistency();

DROP TRIGGER IF EXISTS video_jobs_enforce_club ON public.video_jobs;
CREATE TRIGGER video_jobs_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_reports_enforce_club ON public.video_reports;
CREATE TRIGGER video_reports_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_events_enforce_club ON public.video_events;
CREATE TRIGGER video_events_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_notes_enforce_club ON public.video_notes;
CREATE TRIGGER video_notes_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_clips_enforce_club ON public.video_clips;
CREATE TRIGGER video_clips_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_shares_enforce_club ON public.video_shares;
CREATE TRIGGER video_shares_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP TRIGGER IF EXISTS video_shares_enforce_recipient ON public.video_shares;
CREATE TRIGGER video_shares_enforce_recipient
  BEFORE INSERT OR UPDATE OF shared_with_user_id, club_id ON public.video_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_share_recipient();

DROP TRIGGER IF EXISTS video_news_drafts_enforce_club ON public.video_news_drafts;
CREATE TRIGGER video_news_drafts_enforce_club
  BEFORE INSERT OR UPDATE OF video_id, club_id ON public.video_news_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_video_child_club_consistency();

DROP POLICY IF EXISTS video_news_drafts_select ON public.video_news_drafts;
CREATE POLICY video_news_drafts_select ON public.video_news_drafts FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_videos(club_id)
    OR public.user_has_club_role(
      club_id,
      ARRAY['owner','president','coach']::public.club_role[]
    )
  );

DROP POLICY IF EXISTS club_videos_select ON storage.objects;
DROP POLICY IF EXISTS club_videos_insert ON storage.objects;
DROP POLICY IF EXISTS club_videos_update ON storage.objects;
DROP POLICY IF EXISTS club_videos_delete ON storage.objects;

CREATE POLICY club_videos_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_read_video_storage_path(name)
  );

CREATE POLICY club_videos_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_upload_video_storage_path(name)
  );

CREATE POLICY club_videos_update ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_upload_video_storage_path(name)
  )
  WITH CHECK (
    bucket_id = 'club-videos'
    AND public.actor_can_upload_video_storage_path(name)
  );

CREATE POLICY club_videos_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-videos'
    AND public.actor_can_manage_videos(public.storage_video_club_id_from_path(name))
    AND public.storage_is_club_video_path(name)
  );
