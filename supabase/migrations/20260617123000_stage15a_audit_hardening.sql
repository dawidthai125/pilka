-- ETAP 15A audit: channel variant status, spójność referencji, RLS sponsorów, audyt approvals

CREATE OR REPLACE FUNCTION public.enforce_content_post_reference_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.match_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'match_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = NEW.video_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.sponsor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sponsors s
      WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'sponsor_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_report_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.video_reports vr
      WHERE vr.id = NEW.video_report_id AND vr.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_report_id does not belong to club_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_asset_reference_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.content_posts cp
      WHERE cp.id = NEW.post_id AND cp.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'post_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = NEW.video_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_clip_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.video_clips vc
      JOIN public.videos v ON v.id = vc.video_id
      WHERE vc.id = NEW.video_clip_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_clip_id does not belong to club_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_channel_variant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('approved', 'published') THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role for channel variant status %', NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'queued' THEN
    IF NOT public.actor_can_manage_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to queue channel variant';
    END IF;
  END IF;

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := timezone('utc', now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_posts_enforce_references ON public.content_posts;
CREATE TRIGGER content_posts_enforce_references
  BEFORE INSERT OR UPDATE OF match_id, video_id, sponsor_id, video_report_id, club_id
  ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_reference_consistency();

DROP TRIGGER IF EXISTS content_assets_enforce_references ON public.content_assets;
CREATE TRIGGER content_assets_enforce_references
  BEFORE INSERT OR UPDATE OF post_id, video_id, video_clip_id, club_id
  ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_asset_reference_consistency();

DROP TRIGGER IF EXISTS content_channel_variants_enforce_status ON public.content_channel_variants;
CREATE TRIGGER content_channel_variants_enforce_status
  BEFORE INSERT OR UPDATE OF status, published_at
  ON public.content_channel_variants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_channel_variant_status();

-- Warianty kanałów: coach tylko draft; publikacja/kolejka wymaga roli
DROP POLICY IF EXISTS content_channel_variants_manage ON public.content_channel_variants;

CREATE POLICY content_channel_variants_insert ON public.content_channel_variants FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

CREATE POLICY content_channel_variants_update ON public.content_channel_variants FOR UPDATE TO authenticated
  USING (public.actor_can_access_content_post(post_id))
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      public.actor_can_publish_content(club_id)
      OR status = 'draft'
    )
  );

CREATE POLICY content_channel_variants_delete ON public.content_channel_variants FOR DELETE TO authenticated
  USING (public.actor_can_manage_content(club_id));

-- Audyt: coach może logować tylko submitted
DROP POLICY IF EXISTS content_approvals_insert ON public.content_approvals;
CREATE POLICY content_approvals_insert ON public.content_approvals FOR INSERT TO authenticated
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      action = 'submitted'
      OR public.actor_can_publish_content(club_id)
    )
  );

-- Sponsor widzi assety tylko powiązane z własnymi postami
DROP POLICY IF EXISTS content_assets_select ON public.content_assets;
CREATE POLICY content_assets_select ON public.content_assets FOR SELECT TO authenticated
  USING (
    public.actor_can_read_content(club_id)
    AND (
      public.actor_can_create_content(club_id)
      OR (
        public.actor_is_sponsor_user(club_id)
        AND post_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.content_posts cp
          WHERE cp.id = post_id
            AND cp.sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
        )
      )
    )
  );
