-- ETAP 11 audit fixes: RLS scope, team average aggregate, consistency triggers, indexes

-- Skaut ma wyłącznie dostęp do skautingu — bez odczytu profili rozwoju zawodników klubu
CREATE OR REPLACE FUNCTION public.actor_can_read_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

DROP POLICY IF EXISTS "academy_groups_select" ON public.academy_groups;
CREATE POLICY "academy_groups_select" ON public.academy_groups FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id));

-- Średnia drużyny bez ujawniania pojedynczych profili (zawodnik / rodzic na tej samej drużynie)
CREATE OR REPLACE FUNCTION public.team_development_average(
  p_club_id UUID,
  p_team_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg NUMERIC;
BEGIN
  IF p_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN NULL;
  END IF;

  IF public.actor_can_read_academy(p_club_id) THEN
    SELECT ROUND(AVG(pd.overall_rating)::numeric, 0) INTO v_avg
    FROM public.player_development pd
    JOIN public.players p ON p.id = pd.player_id
    WHERE pd.club_id = p_club_id AND p.team_id = p_team_id;
    RETURN v_avg;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.club_id = p_club_id
      AND p.team_id = p_team_id
      AND (
        p.id = public.player_id_for_user(p_club_id, auth.uid())
        OR p.id IN (SELECT public.parent_player_ids(p_club_id))
      )
  ) THEN
    SELECT ROUND(AVG(pd.overall_rating)::numeric, 0) INTO v_avg
    FROM public.player_development pd
    JOIN public.players p ON p.id = pd.player_id
    WHERE pd.club_id = p_club_id AND p.team_id = p_team_id;
    RETURN v_avg;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_player_row_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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

DROP TRIGGER IF EXISTS player_assessments_enforce_club ON public.player_assessments;
CREATE TRIGGER player_assessments_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_goals_enforce_club ON public.player_goals;
CREATE TRIGGER player_goals_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_goals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS fitness_tests_enforce_club ON public.fitness_tests;
CREATE TRIGGER fitness_tests_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.fitness_tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_team_transitions_enforce_club ON public.player_team_transitions;
CREATE TRIGGER player_team_transitions_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_team_transitions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_development_history_enforce_club ON public.player_development_history;
CREATE TRIGGER player_development_history_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_development_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

CREATE INDEX IF NOT EXISTS idx_player_development_club_player
  ON public.player_development (club_id, player_id);

CREATE INDEX IF NOT EXISTS idx_scouting_reports_player
  ON public.scouting_reports (club_id, scouting_player_id, report_date DESC);

GRANT EXECUTE ON FUNCTION public.team_development_average(UUID, UUID) TO authenticated;
