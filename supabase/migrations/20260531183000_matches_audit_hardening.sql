-- ETAP 4 audit (2): spójność zawodników w wydarzeniach/statystykach, walidacja tabeli

CREATE OR REPLACE FUNCTION public.enforce_match_event_players_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT m.team_id INTO v_team_id FROM public.matches m
  WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id;

  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'event player_id does not belong to match team';
  END IF;

  IF NEW.related_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.related_player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'event related_player_id does not belong to match team';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_events_enforce_players_team ON public.match_events;
CREATE TRIGGER match_events_enforce_players_team
  BEFORE INSERT OR UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_event_players_team();

DROP TRIGGER IF EXISTS match_player_stats_enforce_player_team ON public.match_player_stats;
CREATE TRIGGER match_player_stats_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_player_team();

ALTER TABLE public.league_table_entries
  DROP CONSTRAINT IF EXISTS league_table_played_check;

ALTER TABLE public.league_table_entries
  ADD CONSTRAINT league_table_played_check
  CHECK (played = won + drawn + lost);

CREATE INDEX IF NOT EXISTS idx_league_table_points
  ON public.league_table_entries (club_id, competition, season, points DESC, goals_for DESC);

CREATE INDEX IF NOT EXISTS idx_match_events_club_match
  ON public.match_events (club_id, match_id);

CREATE INDEX IF NOT EXISTS idx_training_attendance_player_marked
  ON public.training_attendance (club_id, player_id, marked_at DESC);
