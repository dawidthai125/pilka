-- ETAP 15.10 audit hardening

CREATE OR REPLACE FUNCTION public.enforce_rehabilitation_plan_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_injury RECORD;
BEGIN
  SELECT club_id, player_id INTO v_injury
  FROM public.player_injuries WHERE id = NEW.injury_id;

  IF v_injury.club_id IS NULL OR v_injury.club_id <> NEW.club_id THEN
    RAISE EXCEPTION 'rehabilitation plan club mismatch';
  END IF;

  NEW.player_id := v_injury.player_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_return_to_play_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_injury RECORD;
BEGIN
  SELECT club_id, player_id INTO v_injury
  FROM public.player_injuries WHERE id = NEW.injury_id;

  IF v_injury.club_id IS NULL OR v_injury.club_id <> NEW.club_id THEN
    RAISE EXCEPTION 'return_to_play club mismatch';
  END IF;

  NEW.player_id := v_injury.player_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rehabilitation_plans_enforce_club ON public.rehabilitation_plans;
CREATE TRIGGER rehabilitation_plans_enforce_club
  BEFORE INSERT OR UPDATE ON public.rehabilitation_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_rehabilitation_plan_club_scope();

DROP TRIGGER IF EXISTS return_to_play_enforce_club ON public.return_to_play;
CREATE TRIGGER return_to_play_enforce_club
  BEFORE INSERT OR UPDATE ON public.return_to_play
  FOR EACH ROW EXECUTE FUNCTION public.enforce_return_to_play_club_scope();

CREATE OR REPLACE FUNCTION public.enforce_injury_coach_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF public.actor_is_coach_team_scoped(NEW.club_id)
    AND NOT public.actor_can_manage_injury_config(NEW.club_id) THEN
    IF NEW.team_id IS NULL OR NEW.team_id NOT IN (SELECT public.coach_team_ids(NEW.club_id)) THEN
      RAISE EXCEPTION 'coach cannot manage injury outside assigned team';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS player_injuries_enforce_coach_team ON public.player_injuries;
CREATE TRIGGER player_injuries_enforce_coach_team
  BEFORE INSERT OR UPDATE ON public.player_injuries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_injury_coach_team_access();
