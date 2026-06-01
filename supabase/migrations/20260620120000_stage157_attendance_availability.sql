-- ETAP 15.7: Attendance & Availability 2.0

ALTER TYPE public.absence_reason ADD VALUE IF NOT EXISTS 'vacation';
ALTER TYPE public.absence_reason ADD VALUE IF NOT EXISTS 'family';

CREATE TYPE public.availability_event_type AS ENUM (
  'training',
  'match',
  'club_event'
);

CREATE TYPE public.attendance_record_source AS ENUM (
  'training',
  'match'
);

CREATE TYPE public.match_call_status AS ENUM (
  'called_up',
  'reserve',
  'not_called_up'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'match_squad_call';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'availability_reminder';

CREATE TABLE public.availability_reasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID REFERENCES public.clubs (id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  label_pl TEXT NOT NULL,
  absence_reason public.absence_reason,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE UNIQUE INDEX availability_reasons_club_code_unique
  ON public.availability_reasons (club_id, code)
  WHERE club_id IS NOT NULL;

CREATE UNIQUE INDEX availability_reasons_system_code_unique
  ON public.availability_reasons (code)
  WHERE club_id IS NULL;

CREATE TABLE public.player_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  event_type public.availability_event_type NOT NULL,
  training_id UUID REFERENCES public.trainings (id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches (id) ON DELETE CASCADE,
  club_event_ref UUID,
  status public.availability_status NOT NULL DEFAULT 'unknown',
  reason_id UUID REFERENCES public.availability_reasons (id) ON DELETE SET NULL,
  absence_reason public.absence_reason,
  comment TEXT,
  declared_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT player_availability_event_check CHECK (
    (event_type = 'training' AND training_id IS NOT NULL AND match_id IS NULL)
    OR (event_type = 'match' AND match_id IS NOT NULL AND training_id IS NULL)
    OR (event_type = 'club_event' AND club_event_ref IS NOT NULL AND training_id IS NULL AND match_id IS NULL)
  ),
  CONSTRAINT player_availability_absent_reason CHECK (
    status <> 'absent' OR absence_reason IS NOT NULL OR reason_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX player_availability_training_unique
  ON public.player_availability (training_id, player_id)
  WHERE training_id IS NOT NULL;

CREATE UNIQUE INDEX player_availability_match_unique
  ON public.player_availability (match_id, player_id)
  WHERE match_id IS NOT NULL;

CREATE UNIQUE INDEX player_availability_club_event_unique
  ON public.player_availability (club_event_ref, player_id)
  WHERE event_type = 'club_event';

CREATE INDEX player_availability_club_player_idx
  ON public.player_availability (club_id, player_id, updated_at DESC);

CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  source_type public.attendance_record_source NOT NULL,
  training_id UUID REFERENCES public.trainings (id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches (id) ON DELETE CASCADE,
  declared_availability public.availability_status,
  attendance_status public.attendance_status NOT NULL,
  absence_reason public.absence_reason,
  comment TEXT,
  season TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT attendance_records_source_check CHECK (
    (source_type = 'training' AND training_id IS NOT NULL AND match_id IS NULL)
    OR (source_type = 'match' AND match_id IS NOT NULL AND training_id IS NULL)
  )
);

CREATE UNIQUE INDEX attendance_records_training_unique
  ON public.attendance_records (training_id, player_id)
  WHERE training_id IS NOT NULL;

CREATE UNIQUE INDEX attendance_records_match_unique
  ON public.attendance_records (match_id, player_id)
  WHERE match_id IS NOT NULL;

CREATE INDEX attendance_records_club_player_idx
  ON public.attendance_records (club_id, player_id, recorded_at DESC);

ALTER TABLE public.match_squad
  ADD COLUMN IF NOT EXISTS call_status public.match_call_status NOT NULL DEFAULT 'not_called_up';

CREATE TABLE public.match_squad_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  response public.attendance_response NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_squad_responses_unique UNIQUE (match_id, player_id)
);

CREATE INDEX match_squad_responses_match_idx ON public.match_squad_responses (match_id);

CREATE TRIGGER player_availability_set_updated_at
  BEFORE UPDATE ON public.player_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER attendance_records_set_updated_at
  BEFORE UPDATE ON public.attendance_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Seed system availability reasons
INSERT INTO public.availability_reasons (club_id, code, label_pl, absence_reason, sort_order)
VALUES
  (NULL, 'injury', 'Kontuzja', 'injury', 1),
  (NULL, 'illness', 'Choroba', 'illness', 2),
  (NULL, 'work', 'Praca', 'work', 3),
  (NULL, 'school', 'Szkoła', 'school', 4),
  (NULL, 'vacation', 'Urlop', 'vacation', 5),
  (NULL, 'family', 'Sprawy rodzinne', 'family', 6),
  (NULL, 'other', 'Inne', 'other', 99)
ON CONFLICT DO NOTHING;

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_managed_player_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id
  FROM public.players p
  WHERE p.club_id = p_club_id
    AND p.email IS NOT NULL
    AND lower(p.email) = lower((
      SELECT pr.email FROM public.profiles pr WHERE pr.id = auth.uid()
    ));

  IF to_regclass('public.player_guardians') IS NOT NULL THEN
    RETURN QUERY EXECUTE $guardian$
      SELECT pg.player_id
      FROM public.player_guardians pg
      WHERE pg.club_id = $1
        AND pg.profile_id = auth.uid()
    $guardian$ USING p_club_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_set_player_availability(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(p_club_id)
      OR p_player_id IN (SELECT public.actor_managed_player_ids(p_club_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_team_availability(p_club_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(p_club_id)
      OR public.actor_can_mark_training_attendance(p_club_id)
      OR (
        public.user_has_club_role(p_club_id, ARRAY['player','parent']::public.club_role[])
        AND EXISTS (
          SELECT 1 FROM public.players p
          WHERE p.club_id = p_club_id
            AND p.team_id = p_team_id
            AND p.id IN (SELECT public.actor_managed_player_ids(p_club_id))
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_respond_match_squad(p_match_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = p_match_id
      AND m.club_id IN (SELECT public.user_club_ids())
      AND m.status = 'planned'
      AND p_player_id IN (SELECT public.actor_managed_player_ids(m.club_id))
      AND EXISTS (
        SELECT 1 FROM public.match_squad ms
        WHERE ms.match_id = p_match_id
          AND ms.player_id = p_player_id
          AND ms.call_status IN ('called_up', 'reserve')
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.sync_training_availability_to_player_availability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.player_availability (
    club_id, player_id, event_type, training_id, status, absence_reason, comment, declared_by
  )
  VALUES (
    NEW.club_id,
    NEW.player_id,
    'training',
    NEW.training_id,
    NEW.status,
    NEW.absence_reason,
    NEW.notes,
    COALESCE(NEW.responded_by, auth.uid())
  )
  ON CONFLICT (training_id, player_id) WHERE training_id IS NOT NULL
  DO UPDATE SET
    status = EXCLUDED.status,
    absence_reason = EXCLUDED.absence_reason,
    comment = EXCLUDED.comment,
    declared_by = EXCLUDED.declared_by,
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

CREATE TRIGGER training_availability_sync_player
  AFTER INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW EXECUTE FUNCTION public.sync_training_availability_to_player_availability();

CREATE OR REPLACE FUNCTION public.sync_training_attendance_to_records()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_season TEXT;
BEGIN
  SELECT tm.season INTO v_season
  FROM public.trainings tr
  JOIN public.teams tm ON tm.id = tr.team_id
  WHERE tr.id = NEW.training_id
  LIMIT 1;

  INSERT INTO public.attendance_records (
    club_id, player_id, source_type, training_id,
    attendance_status, comment, season, recorded_by, recorded_at
  )
  VALUES (
    NEW.club_id, NEW.player_id, 'training', NEW.training_id,
    NEW.status, NEW.notes, v_season, NEW.marked_by, NEW.marked_at
  )
  ON CONFLICT (training_id, player_id) WHERE training_id IS NOT NULL
  DO UPDATE SET
    attendance_status = EXCLUDED.attendance_status,
    comment = EXCLUDED.comment,
    recorded_by = EXCLUDED.recorded_by,
    recorded_at = EXCLUDED.recorded_at,
    updated_at = timezone('utc', now());

  RETURN NEW;
END;
$$;

CREATE TRIGGER training_attendance_sync_records
  AFTER INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW EXECUTE FUNCTION public.sync_training_attendance_to_records();

ALTER TABLE public.availability_reasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_squad_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY availability_reasons_select ON public.availability_reasons FOR SELECT TO authenticated
  USING (club_id IS NULL OR club_id IN (SELECT public.user_club_ids()));

CREATE POLICY availability_reasons_manage ON public.availability_reasons FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

CREATE POLICY player_availability_select ON public.player_availability FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(club_id)
      OR player_id IN (SELECT public.actor_managed_player_ids(club_id))
      OR (
        training_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.trainings tr
          WHERE tr.id = training_id
            AND public.actor_can_read_team_availability(club_id, tr.team_id)
        )
      )
      OR (
        match_id IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM public.matches m
          WHERE m.id = match_id
            AND public.actor_can_read_team_availability(club_id, m.team_id)
        )
      )
    )
  );

CREATE POLICY player_availability_manage ON public.player_availability FOR ALL TO authenticated
  USING (public.actor_can_set_player_availability(club_id, player_id))
  WITH CHECK (public.actor_can_set_player_availability(club_id, player_id));

CREATE POLICY attendance_records_select ON public.attendance_records FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(club_id)
      OR public.actor_can_mark_training_attendance(club_id)
      OR player_id IN (SELECT public.actor_managed_player_ids(club_id))
    )
  );

CREATE POLICY attendance_records_manage ON public.attendance_records FOR ALL TO authenticated
  USING (
    public.actor_can_mark_training_attendance(club_id)
    OR public.actor_can_manage_trainings(club_id)
  )
  WITH CHECK (
    public.actor_can_mark_training_attendance(club_id)
    OR public.actor_can_manage_trainings(club_id)
  );

CREATE POLICY match_squad_responses_select ON public.match_squad_responses FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      user_id = auth.uid()
      OR public.actor_can_manage_matches(club_id)
    )
  );

CREATE POLICY match_squad_responses_insert ON public.match_squad_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_match_squad(match_id, player_id)
  );

CREATE POLICY match_squad_responses_update ON public.match_squad_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_match_squad(match_id, player_id)
  );

GRANT SELECT ON public.availability_reasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.match_squad_responses TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_managed_player_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_set_player_availability(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_team_availability(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_respond_match_squad(UUID, UUID) TO authenticated;
