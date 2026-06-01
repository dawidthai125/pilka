-- ETAP 15.7 audit hardening

CREATE OR REPLACE FUNCTION public.enforce_player_availability_player_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.training_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.trainings tr
      JOIN public.players p ON p.id = NEW.player_id AND p.club_id = NEW.club_id
      WHERE tr.id = NEW.training_id AND tr.club_id = NEW.club_id AND tr.team_id = p.team_id
    ) THEN
      RAISE EXCEPTION 'player not on training team';
    END IF;
  ELSIF NEW.match_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.matches m
      JOIN public.players p ON p.id = NEW.player_id AND p.club_id = NEW.club_id
      WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id AND m.team_id = p.team_id
    ) THEN
      RAISE EXCEPTION 'player not on match team';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER player_availability_enforce_team
  BEFORE INSERT OR UPDATE ON public.player_availability
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_availability_player_club();

CREATE OR REPLACE FUNCTION public.enforce_match_squad_response_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'match_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER match_squad_responses_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_squad_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_response_club();

CREATE INDEX IF NOT EXISTS player_availability_match_status_idx
  ON public.player_availability (club_id, match_id, status);

CREATE INDEX IF NOT EXISTS attendance_records_season_idx
  ON public.attendance_records (club_id, season, player_id);

CREATE INDEX IF NOT EXISTS match_squad_call_status_idx
  ON public.match_squad (club_id, match_id, call_status);
