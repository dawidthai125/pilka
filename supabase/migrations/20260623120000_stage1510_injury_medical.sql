-- ETAP 15.10: Injury & Medical Management (sport availability — not clinical records)

ALTER TYPE public.availability_status ADD VALUE IF NOT EXISTS 'limited';

CREATE TYPE public.injury_record_status AS ENUM (
  'active',
  'rehabilitation',
  'ready_for_training',
  'closed'
);

CREATE TYPE public.injury_availability_impact AS ENUM (
  'unavailable',
  'limited'
);

CREATE TYPE public.rehabilitation_plan_status AS ENUM (
  'started',
  'in_progress',
  'completed'
);

CREATE TYPE public.return_to_training_status AS ENUM (
  'no_clearance',
  'individual',
  'partial',
  'full'
);

CREATE TYPE public.return_to_match_status AS ENUM (
  'unavailable',
  'conditional',
  'available'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'injury_reported';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'injury_return_training';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'injury_return_match';

CREATE TABLE public.injury_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT injury_categories_club_slug_unique UNIQUE (club_id, slug)
);

CREATE INDEX injury_categories_club_idx ON public.injury_categories (club_id, sort_order);

ALTER TABLE public.player_injuries
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.injury_categories (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS injury_status public.injury_record_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS availability_impact public.injury_availability_impact,
  ADD COLUMN IF NOT EXISTS expected_return_date DATE;

UPDATE public.player_injuries
SET
  injury_status = CASE
    WHEN is_active THEN 'active'::public.injury_record_status
    ELSE 'closed'::public.injury_record_status
  END,
  expected_return_date = COALESCE(expected_return_date, recovery_date)
WHERE expected_return_date IS NULL OR (NOT is_active AND injury_status = 'active');

UPDATE public.player_injuries pi
SET team_id = p.team_id
FROM public.players p
WHERE pi.player_id = p.id AND pi.team_id IS NULL;

CREATE INDEX player_injuries_club_status_idx
  ON public.player_injuries (club_id, injury_status)
  WHERE injury_status <> 'closed';

CREATE INDEX player_injuries_team_idx ON public.player_injuries (club_id, team_id);

CREATE TABLE public.rehabilitation_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  injury_id UUID NOT NULL REFERENCES public.player_injuries (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  stage_label TEXT NOT NULL DEFAULT 'Etap I',
  coach_note TEXT,
  progress_note TEXT,
  status public.rehabilitation_plan_status NOT NULL DEFAULT 'started',
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT rehabilitation_plans_injury_unique UNIQUE (injury_id)
);

CREATE INDEX rehabilitation_plans_club_player_idx
  ON public.rehabilitation_plans (club_id, player_id, status);

CREATE TABLE public.return_to_play (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  injury_id UUID NOT NULL REFERENCES public.player_injuries (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  training_status public.return_to_training_status NOT NULL DEFAULT 'no_clearance',
  match_status public.return_to_match_status NOT NULL DEFAULT 'unavailable',
  notes TEXT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT return_to_play_injury_unique UNIQUE (injury_id)
);

CREATE INDEX return_to_play_club_player_idx ON public.return_to_play (club_id, player_id);

CREATE TRIGGER rehabilitation_plans_set_updated_at
  BEFORE UPDATE ON public.rehabilitation_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER return_to_play_set_updated_at
  BEFORE UPDATE ON public.return_to_play
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_injury_config(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner', 'president', 'sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_injury_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_injury_config(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_injury_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_injury_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_injury_row(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_injury_staff(p_club_id)
      OR public.actor_can_read_player_row(p_club_id, p_player_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_injury_row(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_player_row(p_club_id, p_player_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_injury_portal(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['player', 'parent']::public.club_role[]
    );
$$;

-- Sync injury impact → player_availability (club_event scope)
CREATE OR REPLACE FUNCTION public.sync_injury_availability_impact()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status public.availability_status;
  v_declared_by UUID;
BEGIN
  v_declared_by := COALESCE(NEW.created_by, auth.uid());

  IF NEW.injury_status IN ('active', 'rehabilitation')
    AND NEW.availability_impact IS NOT NULL THEN
    v_status := CASE
      WHEN NEW.availability_impact = 'unavailable' THEN 'absent'::public.availability_status
      ELSE 'limited'::public.availability_status
    END;

    INSERT INTO public.player_availability (
      club_id, player_id, event_type, club_event_ref,
      status, absence_reason, comment, declared_by
    )
    VALUES (
      NEW.club_id,
      NEW.player_id,
      'club_event',
      NEW.id,
      v_status,
      'injury',
      left(NEW.description, 500),
      v_declared_by
    )
    ON CONFLICT (club_event_ref, player_id)
    WHERE event_type = 'club_event'
    DO UPDATE SET
      status = EXCLUDED.status,
      absence_reason = EXCLUDED.absence_reason,
      comment = EXCLUDED.comment,
      declared_by = EXCLUDED.declared_by,
      updated_at = timezone('utc', now());
  ELSE
    DELETE FROM public.player_availability
    WHERE club_id = NEW.club_id
      AND player_id = NEW.player_id
      AND event_type = 'club_event'
      AND club_event_ref = NEW.id;
  END IF;

  NEW.is_active := NEW.injury_status NOT IN ('closed', 'ready_for_training');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_injuries_sync_availability ON public.player_injuries;
CREATE TRIGGER player_injuries_sync_availability
  BEFORE INSERT OR UPDATE OF injury_status, availability_impact, description, player_id, club_id
  ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.sync_injury_availability_impact();

CREATE OR REPLACE FUNCTION public.enforce_injury_team_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT team_id INTO v_team_id FROM public.players WHERE id = NEW.player_id LIMIT 1;
  NEW.team_id := COALESCE(NEW.team_id, v_team_id);

  IF NEW.category_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.injury_categories ic
      WHERE ic.id = NEW.category_id AND ic.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'invalid injury category for club';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_injuries_enforce_team ON public.player_injuries;
CREATE TRIGGER player_injuries_enforce_team
  BEFORE INSERT OR UPDATE ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_injury_team_scope();

ALTER TABLE public.injury_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rehabilitation_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_to_play ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "player_injuries_select" ON public.player_injuries;
DROP POLICY IF EXISTS "player_injuries_manage" ON public.player_injuries;

CREATE POLICY player_injuries_select ON public.player_injuries FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_injury_row(club_id, player_id)
  );

CREATE POLICY player_injuries_manage ON public.player_injuries FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_injury_row(club_id, player_id));

CREATE POLICY injury_categories_select ON public.injury_categories FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_injury_staff(club_id)
      OR public.actor_can_access_injury_portal(club_id)
    )
  );

CREATE POLICY injury_categories_manage ON public.injury_categories FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_config(club_id))
  WITH CHECK (public.actor_can_manage_injury_config(club_id));

CREATE POLICY rehabilitation_plans_select ON public.rehabilitation_plans FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_injury_row(club_id, player_id)
  );

CREATE POLICY rehabilitation_plans_manage ON public.rehabilitation_plans FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_injury_row(club_id, player_id));

CREATE POLICY return_to_play_select ON public.return_to_play FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_injury_row(club_id, player_id)
  );

CREATE POLICY return_to_play_manage ON public.return_to_play FOR ALL TO authenticated
  USING (public.actor_can_manage_injury_row(club_id, player_id))
  WITH CHECK (public.actor_can_manage_injury_row(club_id, player_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.injury_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rehabilitation_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.return_to_play TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_manage_injury_config(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_injury_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_injury_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_injury_row(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_injury_row(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_injury_portal(UUID) TO authenticated;
