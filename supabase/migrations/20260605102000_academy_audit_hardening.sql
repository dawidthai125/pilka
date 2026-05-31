-- ETAP 11 audit: GRANTs, spójność club_id, indeksy

CREATE OR REPLACE FUNCTION public.enforce_academy_group_staff_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.academy_groups g
    WHERE g.id = NEW.group_id AND g.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'group_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_group_staff_enforce_club ON public.academy_group_staff;
CREATE TRIGGER academy_group_staff_enforce_club
  BEFORE INSERT OR UPDATE OF group_id, club_id ON public.academy_group_staff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_academy_group_staff_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_player_development_club_consistency()
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

DROP TRIGGER IF EXISTS player_development_enforce_club ON public.player_development;
CREATE TRIGGER player_development_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_development
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_development_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_scouting_report_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.scouting_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.scouting_players sp
    WHERE sp.id = NEW.scouting_player_id AND sp.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'scouting_player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scouting_reports_enforce_club ON public.scouting_reports;
CREATE TRIGGER scouting_reports_enforce_club
  BEFORE INSERT OR UPDATE ON public.scouting_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scouting_report_club_consistency();

CREATE INDEX IF NOT EXISTS idx_player_assessments_club_date
  ON public.player_assessments (club_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_fitness_tests_club_type
  ON public.fitness_tests (club_id, test_type, test_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_group_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_development TO authenticated;
GRANT SELECT, INSERT ON public.player_development_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_team_transitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opponent_analysis TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_academy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_academy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_scouting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_scouting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_own_development(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_development_row(UUID, UUID) TO authenticated;
