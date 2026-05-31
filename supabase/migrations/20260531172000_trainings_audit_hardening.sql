-- ETAP 3 audit: spójność relacji treningów, RLS powiadomień, indeksy

CREATE OR REPLACE FUNCTION public.enforce_training_player_on_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  SELECT tr.team_id INTO v_team_id
  FROM public.trainings tr
  WHERE tr.id = NEW.training_id
    AND tr.club_id = NEW.club_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'training_id does not belong to club_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = NEW.player_id
      AND p.club_id = NEW.club_id
      AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to training team';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_note_player_on_team()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  IF NEW.player_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT tr.team_id INTO v_team_id
  FROM public.trainings tr
  WHERE tr.id = NEW.training_id
    AND tr.club_id = NEW.club_id;

  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'training_id does not belong to club_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.id = NEW.player_id
      AND p.club_id = NEW.club_id
      AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to training team';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_training_availability_reason()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.status <> 'absent' THEN
    NEW.absence_reason := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS training_availability_enforce_team ON public.training_availability;
CREATE TRIGGER training_availability_enforce_team
  BEFORE INSERT OR UPDATE ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_player_on_team();

DROP TRIGGER IF EXISTS training_attendance_enforce_team ON public.training_attendance;
CREATE TRIGGER training_attendance_enforce_team
  BEFORE INSERT OR UPDATE ON public.training_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_player_on_team();

DROP TRIGGER IF EXISTS training_notes_enforce_player_team ON public.training_session_notes;
CREATE TRIGGER training_notes_enforce_player_team
  BEFORE INSERT OR UPDATE OF player_id, training_id, club_id ON public.training_session_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_note_player_on_team();

DROP TRIGGER IF EXISTS training_availability_enforce_reason ON public.training_availability;
CREATE TRIGGER training_availability_enforce_reason
  BEFORE INSERT OR UPDATE OF status, absence_reason ON public.training_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_training_availability_reason();

CREATE INDEX IF NOT EXISTS idx_training_attendance_club_training
  ON public.training_attendance (club_id, training_id);

CREATE INDEX IF NOT EXISTS idx_training_availability_club_training
  ON public.training_availability (club_id, training_id);

CREATE INDEX IF NOT EXISTS idx_trainings_club_status_date
  ON public.trainings (club_id, status, training_date);

DROP POLICY IF EXISTS "club_notifications_update_own" ON public.club_notifications;
CREATE POLICY "club_notifications_update_own"
  ON public.club_notifications FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    AND club_id IN (SELECT public.user_club_ids())
  )
  WITH CHECK (
    user_id = auth.uid()
    AND club_id IN (SELECT public.user_club_ids())
  );
