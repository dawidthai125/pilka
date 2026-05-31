-- ETAP 4 audit: spójność MVP z meczem, indeksy wydajności

CREATE OR REPLACE FUNCTION public.enforce_match_mvp_player_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT m.team_id INTO v_team_id FROM public.matches m
  WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'mvp player_id does not belong to match team';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_mvp_enforce_player_team ON public.match_mvp_history;
CREATE TRIGGER match_mvp_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_mvp_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_mvp_player_team();

CREATE OR REPLACE FUNCTION public.enforce_match_mvp_on_matches()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mvp_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.mvp_player_id AND p.club_id = NEW.club_id AND p.team_id = NEW.team_id
  ) THEN
    RAISE EXCEPTION 'mvp_player_id does not belong to match team';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS matches_enforce_mvp_player ON public.matches;
CREATE TRIGGER matches_enforce_mvp_player
  BEFORE INSERT OR UPDATE OF mvp_player_id ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_mvp_on_matches();

CREATE INDEX IF NOT EXISTS idx_match_player_stats_club_player
  ON public.match_player_stats (club_id, player_id);

CREATE INDEX IF NOT EXISTS idx_matches_club_completed_date
  ON public.matches (club_id, match_date DESC)
  WHERE status = 'completed';
