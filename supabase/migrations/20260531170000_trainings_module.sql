-- ETAP 3: Moduł treningów — schemat, funkcje RLS, powiadomienia

CREATE TYPE public.training_status AS ENUM (
  'planned',
  'completed',
  'cancelled'
);

CREATE TYPE public.availability_status AS ENUM (
  'present',
  'absent',
  'unknown'
);

CREATE TYPE public.absence_reason AS ENUM (
  'work',
  'school',
  'injury',
  'travel',
  'illness',
  'other'
);

CREATE TYPE public.attendance_status AS ENUM (
  'present',
  'absent',
  'late',
  'excused'
);

CREATE TYPE public.training_reminder_type AS ENUM (
  'hours_48',
  'hours_24',
  'hours_3'
);

CREATE TABLE public.trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  training_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location TEXT,
  description TEXT,
  coach_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  status public.training_status NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT trainings_time_order CHECK (end_time > start_time)
);

CREATE INDEX idx_trainings_club_date ON public.trainings (club_id, training_date);
CREATE INDEX idx_trainings_team_date ON public.trainings (team_id, training_date);
CREATE INDEX idx_trainings_coach ON public.trainings (coach_user_id);
CREATE INDEX idx_trainings_status ON public.trainings (club_id, status);

CREATE TABLE public.training_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  status public.availability_status NOT NULL DEFAULT 'unknown',
  absence_reason public.absence_reason,
  notes TEXT,
  responded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT training_availability_unique UNIQUE (training_id, player_id),
  CONSTRAINT training_availability_reason_check CHECK (
    status <> 'absent' OR absence_reason IS NOT NULL
  )
);

CREATE INDEX idx_training_availability_training ON public.training_availability (training_id);
CREATE INDEX idx_training_availability_player ON public.training_availability (player_id);

CREATE TABLE public.training_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  status public.attendance_status NOT NULL,
  notes TEXT,
  marked_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  marked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT training_attendance_unique UNIQUE (training_id, player_id)
);

CREATE INDEX idx_training_attendance_training ON public.training_attendance (training_id);
CREATE INDEX idx_training_attendance_player ON public.training_attendance (player_id);

CREATE TABLE public.training_session_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_training_session_notes_training ON public.training_session_notes (training_id);

CREATE TABLE public.club_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  training_id UUID REFERENCES public.trainings (id) ON DELETE CASCADE,
  reminder_type public.training_reminder_type,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  read_at TIMESTAMPTZ,
  delivery_channels JSONB NOT NULL DEFAULT '["in_app"]'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_club_notifications_user ON public.club_notifications (user_id, scheduled_at DESC);
CREATE INDEX idx_club_notifications_unread ON public.club_notifications (user_id, read_at)
  WHERE read_at IS NULL;
CREATE UNIQUE INDEX idx_club_notifications_dedup
  ON public.club_notifications (user_id, training_id, reminder_type)
  WHERE training_id IS NOT NULL AND reminder_type IS NOT NULL;

CREATE TRIGGER trainings_set_updated_at
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER training_availability_set_updated_at
  BEFORE UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER training_attendance_set_updated_at
  BEFORE UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER training_session_notes_set_updated_at
  BEFORE UPDATE ON public.training_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.actor_can_read_trainings(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY[
      'owner', 'president', 'sports_director', 'coach',
      'player', 'parent'
    ]::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_trainings(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_mark_training_attendance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_set_training_availability(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY[
      'owner', 'president', 'sports_director', 'coach',
      'player', 'parent'
    ]::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.player_id_for_user(p_club_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id
  FROM public.players p
  JOIN public.profiles pr ON pr.id = p_user_id
  WHERE p.club_id = p_club_id
    AND p.email IS NOT NULL
    AND lower(p.email) = lower(pr.email)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_team_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.trainings tr
    WHERE tr.id = NEW.training_id AND tr.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'training_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_availability_player_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trainings_enforce_team_club ON public.trainings;
CREATE TRIGGER trainings_enforce_team_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_team_club_consistency();

DROP TRIGGER IF EXISTS training_availability_enforce_club ON public.training_availability;
CREATE TRIGGER training_availability_enforce_club
  BEFORE INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_child_club_consistency();

DROP TRIGGER IF EXISTS training_availability_enforce_player ON public.training_availability;
CREATE TRIGGER training_availability_enforce_player
  BEFORE INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_availability_player_club();

DROP TRIGGER IF EXISTS training_attendance_enforce_club ON public.training_attendance;
CREATE TRIGGER training_attendance_enforce_club
  BEFORE INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_child_club_consistency();

DROP TRIGGER IF EXISTS training_attendance_enforce_player ON public.training_attendance;
CREATE TRIGGER training_attendance_enforce_player
  BEFORE INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_availability_player_club();

DROP TRIGGER IF EXISTS training_notes_enforce_club ON public.training_session_notes;
CREATE TRIGGER training_notes_enforce_club
  BEFORE INSERT OR UPDATE ON public.training_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_child_club_consistency();

ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.club_notifications ENABLE ROW LEVEL SECURITY;

-- trainings
CREATE POLICY "trainings_select"
  ON public.trainings FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "trainings_manage"
  ON public.trainings FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

-- availability
CREATE POLICY "training_availability_select"
  ON public.training_availability FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "training_availability_manage_staff"
  ON public.training_availability FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

CREATE POLICY "training_availability_manage_self"
  ON public.training_availability FOR INSERT TO authenticated
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND player_id = public.player_id_for_user(club_id, auth.uid())
    AND public.actor_can_set_training_availability(club_id)
  );

CREATE POLICY "training_availability_update_self"
  ON public.training_availability FOR UPDATE TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND player_id = public.player_id_for_user(club_id, auth.uid())
    AND public.actor_can_set_training_availability(club_id)
  )
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND player_id = public.player_id_for_user(club_id, auth.uid())
    AND public.actor_can_set_training_availability(club_id)
  );

-- attendance
CREATE POLICY "training_attendance_select"
  ON public.training_attendance FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "training_attendance_manage"
  ON public.training_attendance FOR ALL TO authenticated
  USING (public.actor_can_mark_training_attendance(club_id))
  WITH CHECK (public.actor_can_mark_training_attendance(club_id));

-- session notes
CREATE POLICY "training_notes_select"
  ON public.training_session_notes FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_trainings(club_id));

CREATE POLICY "training_notes_manage"
  ON public.training_session_notes FOR ALL TO authenticated
  USING (public.actor_can_manage_trainings(club_id))
  WITH CHECK (public.actor_can_manage_trainings(club_id));

-- notifications — tylko własne
CREATE POLICY "club_notifications_select_own"
  ON public.club_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY "club_notifications_update_own"
  ON public.club_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "club_notifications_insert_staff"
  ON public.club_notifications FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_trainings(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.trainings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_availability TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_attendance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_session_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.club_notifications TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_trainings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_trainings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_mark_training_attendance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_set_training_availability(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_id_for_user(UUID, UUID) TO authenticated;
