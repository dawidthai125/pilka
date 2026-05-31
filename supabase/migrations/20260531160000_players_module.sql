-- ETAP 2: Moduł zawodników — schemat, funkcje pomocnicze, RLS

CREATE TYPE public.player_status AS ENUM (
  'active',
  'injured',
  'suspended',
  'inactive'
);

CREATE TYPE public.player_position AS ENUM (
  'goalkeeper',
  'defender',
  'midfielder',
  'forward'
);

CREATE TYPE public.dominant_foot AS ENUM (
  'left',
  'right',
  'both'
);

CREATE TYPE public.player_document_type AS ENUM (
  'medical_exam',
  'parent_consent',
  'club_declaration',
  'insurance',
  'document_photo',
  'other'
);

CREATE TYPE public.player_history_event_type AS ENUM (
  'transfer_in',
  'transfer_out',
  'previous_club',
  'position_change',
  'jersey_number_change'
);

CREATE TYPE public.coach_note_type AS ENUM (
  'observation',
  'progress',
  'health',
  'training_goal'
);

CREATE TABLE public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  jersey_number INTEGER,
  primary_position public.player_position,
  secondary_position public.player_position,
  dominant_foot public.dominant_foot,
  height_cm INTEGER,
  weight_kg NUMERIC(5, 2),
  status public.player_status NOT NULL DEFAULT 'active',
  joined_at DATE,
  left_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT players_jersey_unique_per_team UNIQUE (club_id, team_id, jersey_number),
  CONSTRAINT players_height_check CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  CONSTRAINT players_weight_check CHECK (weight_kg IS NULL OR weight_kg BETWEEN 30 AND 200)
);

CREATE INDEX idx_players_club_id ON public.players (club_id);
CREATE INDEX idx_players_team_id ON public.players (team_id);
CREATE INDEX idx_players_status ON public.players (club_id, status);
CREATE INDEX idx_players_name ON public.players (club_id, last_name, first_name);

CREATE TABLE public.player_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  document_type public.player_document_type NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size INTEGER,
  expires_at DATE,
  notes TEXT,
  uploaded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_documents_player ON public.player_documents (player_id);
CREATE INDEX idx_player_documents_expires ON public.player_documents (club_id, expires_at);

CREATE TABLE public.player_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  season TEXT NOT NULL,
  matches_played INTEGER NOT NULL DEFAULT 0,
  goals INTEGER NOT NULL DEFAULT 0,
  assists INTEGER NOT NULL DEFAULT 0,
  yellow_cards INTEGER NOT NULL DEFAULT 0,
  red_cards INTEGER NOT NULL DEFAULT 0,
  minutes_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT player_stats_unique_season UNIQUE (player_id, season)
);

CREATE INDEX idx_player_stats_player ON public.player_stats (player_id);

CREATE TABLE public.player_club_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  event_type public.player_history_event_type NOT NULL,
  event_date DATE NOT NULL,
  description TEXT,
  previous_value TEXT,
  new_value TEXT,
  related_club_name TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_club_history_player ON public.player_club_history (player_id, event_date DESC);

CREATE TABLE public.player_injuries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  injury_date DATE NOT NULL,
  recovery_date DATE,
  description TEXT NOT NULL,
  severity TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_injuries_player ON public.player_injuries (player_id, injury_date DESC);

CREATE TABLE public.player_coach_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  note_type public.coach_note_type NOT NULL DEFAULT 'observation',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_coach_notes_player ON public.player_coach_notes (player_id, created_at DESC);

CREATE TRIGGER players_set_updated_at
  BEFORE UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_documents_set_updated_at
  BEFORE UPDATE ON public.player_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_stats_set_updated_at
  BEFORE UPDATE ON public.player_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_injuries_set_updated_at
  BEFORE UPDATE ON public.player_injuries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER player_coach_notes_set_updated_at
  BEFORE UPDATE ON public.player_coach_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Coaching staff: owner, president, sports_director, coach
CREATE OR REPLACE FUNCTION public.actor_is_coaching_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(
    p_club_id,
    ARRAY['owner', 'president', 'sports_director', 'coach']::public.club_role[]
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_players(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.actor_is_coaching_staff(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_players(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.get_document_validity_status(p_expires_at DATE)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_expires_at IS NULL THEN 'valid'
    WHEN p_expires_at < CURRENT_DATE THEN 'expired'
    WHEN p_expires_at <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END;
$$;

CREATE OR REPLACE FUNCTION public.log_player_history_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.primary_position IS DISTINCT FROM OLD.primary_position THEN
    INSERT INTO public.player_club_history (
      club_id, player_id, event_type, event_date,
      previous_value, new_value, description
    ) VALUES (
      NEW.club_id, NEW.id, 'position_change', CURRENT_DATE,
      OLD.primary_position::TEXT, NEW.primary_position::TEXT,
      'Zmiana pozycji głównej'
    );
  END IF;

  IF NEW.jersey_number IS DISTINCT FROM OLD.jersey_number THEN
    INSERT INTO public.player_club_history (
      club_id, player_id, event_type, event_date,
      previous_value, new_value, description
    ) VALUES (
      NEW.club_id, NEW.id, 'jersey_number_change', CURRENT_DATE,
      OLD.jersey_number::TEXT, NEW.jersey_number::TEXT,
      'Zmiana numeru na koszulce'
    );
  END IF;

  IF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    INSERT INTO public.player_club_history (
      club_id, player_id, event_type, event_date,
      previous_value, new_value, description
    ) VALUES (
      NEW.club_id, NEW.id, 'transfer_in', CURRENT_DATE,
      OLD.team_id::TEXT, NEW.team_id::TEXT,
      'Zmiana drużyny'
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER players_log_history
  AFTER UPDATE ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.log_player_history_on_update();

ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_club_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_coach_notes ENABLE ROW LEVEL SECURITY;

-- players
CREATE POLICY "players_select"
  ON public.players FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "players_insert"
  ON public.players FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_players(club_id));

CREATE POLICY "players_update"
  ON public.players FOR UPDATE TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

CREATE POLICY "players_delete"
  ON public.players FOR DELETE TO authenticated
  USING (public.actor_can_manage_players(club_id));

-- player_documents
CREATE POLICY "player_documents_select"
  ON public.player_documents FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_documents_manage"
  ON public.player_documents FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_stats
CREATE POLICY "player_stats_select"
  ON public.player_stats FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_stats_manage"
  ON public.player_stats FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_club_history
CREATE POLICY "player_history_select"
  ON public.player_club_history FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_history_manage"
  ON public.player_club_history FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_injuries
CREATE POLICY "player_injuries_select"
  ON public.player_injuries FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_can_read_players(club_id));

CREATE POLICY "player_injuries_manage"
  ON public.player_injuries FOR ALL TO authenticated
  USING (public.actor_can_manage_players(club_id))
  WITH CHECK (public.actor_can_manage_players(club_id));

-- player_coach_notes — tylko sztab szkoleniowy
CREATE POLICY "player_coach_notes_select"
  ON public.player_coach_notes FOR SELECT TO authenticated
  USING (club_id IN (SELECT public.user_club_ids()) AND public.actor_is_coaching_staff(club_id));

CREATE POLICY "player_coach_notes_manage"
  ON public.player_coach_notes FOR ALL TO authenticated
  USING (public.actor_is_coaching_staff(club_id))
  WITH CHECK (public.actor_is_coaching_staff(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_stats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_club_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_injuries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_coach_notes TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_is_coaching_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_players(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_players(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_document_validity_status(DATE) TO authenticated;
