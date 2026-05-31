-- ETAP 4: Moduł meczów — schemat, funkcje RLS

CREATE TYPE public.match_status AS ENUM (
  'planned',
  'in_progress',
  'completed',
  'cancelled',
  'postponed'
);

CREATE TYPE public.match_squad_role AS ENUM (
  'squad',
  'starter',
  'substitute'
);

CREATE TYPE public.match_event_type AS ENUM (
  'goal',
  'assist',
  'yellow_card',
  'red_card',
  'substitution',
  'injury'
);

CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  round_number INTEGER,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  stadium TEXT,
  stadium_address TEXT,
  status public.match_status NOT NULL DEFAULT 'planned',
  home_score INTEGER,
  away_score INTEGER,
  formation TEXT,
  mvp_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  coach_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT matches_score_check CHECK (
    (home_score IS NULL AND away_score IS NULL)
    OR (home_score IS NOT NULL AND away_score IS NOT NULL)
  )
);

CREATE INDEX idx_matches_club_date ON public.matches (club_id, match_date);
CREATE INDEX idx_matches_team_date ON public.matches (team_id, match_date);
CREATE INDEX idx_matches_club_season ON public.matches (club_id, season, competition);
CREATE INDEX idx_matches_status ON public.matches (club_id, status);

CREATE TABLE public.match_squad (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  squad_role public.match_squad_role NOT NULL DEFAULT 'squad',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_squad_unique UNIQUE (match_id, player_id)
);

CREATE INDEX idx_match_squad_match ON public.match_squad (match_id);

CREATE TABLE public.match_lineup_positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  slot_code TEXT NOT NULL,
  pos_x NUMERIC(5, 2) NOT NULL CHECK (pos_x >= 0 AND pos_x <= 100),
  pos_y NUMERIC(5, 2) NOT NULL CHECK (pos_y >= 0 AND pos_y <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_lineup_unique UNIQUE (match_id, player_id)
);

CREATE INDEX idx_match_lineup_match ON public.match_lineup_positions (match_id);

CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  event_type public.match_event_type NOT NULL,
  minute INTEGER NOT NULL CHECK (minute >= 0 AND minute <= 130),
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  related_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_match_events_match ON public.match_events (match_id, minute);

CREATE TABLE public.match_player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  is_starter BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_player_stats_unique UNIQUE (match_id, player_id)
);

CREATE INDEX idx_match_player_stats_player ON public.match_player_stats (player_id);
CREATE INDEX idx_match_player_stats_match ON public.match_player_stats (match_id);

CREATE TABLE public.match_mvp_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  selected_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT match_mvp_unique UNIQUE (match_id)
);

CREATE TABLE public.league_table_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  team_name TEXT NOT NULL,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  is_own_club BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT league_table_unique UNIQUE (club_id, competition, season, team_name)
);

CREATE INDEX idx_league_table_lookup ON public.league_table_entries (club_id, competition, season);

CREATE TRIGGER matches_set_updated_at
  BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER match_squad_set_updated_at
  BEFORE UPDATE ON public.match_squad
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER match_lineup_set_updated_at
  BEFORE UPDATE ON public.match_lineup_positions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER match_player_stats_set_updated_at
  BEFORE UPDATE ON public.match_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_table_set_updated_at
  BEFORE UPDATE ON public.league_table_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.actor_can_read_matches(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY['owner','president','sports_director','coach','player','parent']::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_matches(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.enforce_match_team_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_match_child_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.matches m WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'match_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_match_squad_player_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT m.team_id INTO v_team_id FROM public.matches m
  WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to match team';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER matches_enforce_team_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_team_club_consistency();

CREATE TRIGGER match_squad_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_squad
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_squad_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_squad
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_player_team();

CREATE TRIGGER match_lineup_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_lineup_positions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_lineup_enforce_player_team
  BEFORE INSERT OR UPDATE ON public.match_lineup_positions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_player_team();

CREATE TRIGGER match_events_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_player_stats_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

CREATE TRIGGER match_mvp_enforce_club
  BEFORE INSERT OR UPDATE ON public.match_mvp_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_child_club_consistency();

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_squad ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_lineup_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_mvp_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_table_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_select" ON public.matches FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "matches_manage" ON public.matches FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_squad_select" ON public.match_squad FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_squad_manage" ON public.match_squad FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_lineup_select" ON public.match_lineup_positions FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_lineup_manage" ON public.match_lineup_positions FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_events_select" ON public.match_events FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_events_manage" ON public.match_events FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_player_stats_select" ON public.match_player_stats FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_player_stats_manage" ON public.match_player_stats FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "match_mvp_select" ON public.match_mvp_history FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "match_mvp_manage" ON public.match_mvp_history FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

CREATE POLICY "league_table_select" ON public.league_table_entries FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_matches(club_id));

CREATE POLICY "league_table_manage" ON public.league_table_entries FOR ALL TO authenticated
  USING (public.actor_can_manage_matches(club_id))
  WITH CHECK (public.actor_can_manage_matches(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_squad TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_lineup_positions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_player_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_mvp_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_table_entries TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_matches(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_matches(UUID) TO authenticated;
