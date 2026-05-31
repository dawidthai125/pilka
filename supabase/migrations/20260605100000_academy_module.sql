-- ETAP 11: Akademia klubowa, rozwój zawodników, skauting

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'scout';

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'academy';
ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'scouting';

CREATE TYPE public.academy_age_group AS ENUM (
  'skrzaty',
  'zaki',
  'orliki',
  'mlodziki',
  'trampkarze',
  'juniorzy',
  'seniorzy'
);

CREATE TYPE public.academy_staff_role AS ENUM (
  'head_coach',
  'assistant_coach',
  'goalkeeper_coach'
);

CREATE TYPE public.player_goal_status AS ENUM (
  'active',
  'completed',
  'cancelled'
);

CREATE TYPE public.fitness_test_type AS ENUM (
  'sprint_5m',
  'sprint_10m',
  'sprint_30m',
  'beep_test',
  'vertical_jump',
  'agility'
);

CREATE TYPE public.scouting_player_status AS ENUM (
  'observed',
  'testing',
  'recommended',
  'rejected',
  'signed'
);

CREATE TYPE public.scouting_club_type AS ENUM (
  'league_opponent',
  'academy',
  'partner'
);

CREATE TYPE public.team_transition_type AS ENUM (
  'promotion',
  'demotion',
  'loan',
  'other'
);

-- ---------------------------------------------------------------------------
-- Grupy akademii
-- ---------------------------------------------------------------------------

CREATE TABLE public.academy_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  age_group public.academy_age_group NOT NULL,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, age_group)
);

CREATE TRIGGER academy_groups_set_updated_at
  BEFORE UPDATE ON public.academy_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_academy_groups_club ON public.academy_groups (club_id);

CREATE TABLE public.academy_group_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.academy_groups (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  staff_role public.academy_staff_role NOT NULL DEFAULT 'head_coach',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (group_id, profile_id, staff_role)
);

CREATE INDEX idx_academy_group_staff_club ON public.academy_group_staff (club_id, group_id);

-- ---------------------------------------------------------------------------
-- Profil rozwoju zawodnika
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_development (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  potential INTEGER NOT NULL DEFAULT 50 CHECK (potential BETWEEN 1 AND 100),
  development_level INTEGER NOT NULL DEFAULT 50 CHECK (development_level BETWEEN 1 AND 100),
  overall_rating INTEGER NOT NULL DEFAULT 50 CHECK (overall_rating BETWEEN 1 AND 100),
  notes TEXT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id)
);

CREATE TRIGGER player_development_set_updated_at
  BEFORE UPDATE ON public.player_development
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.player_development_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  potential INTEGER NOT NULL CHECK (potential BETWEEN 1 AND 100),
  development_level INTEGER NOT NULL CHECK (development_level BETWEEN 1 AND 100),
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 100),
  note TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_development_history_player ON public.player_development_history (club_id, player_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Oceny trenerskie
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  assessor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  assessed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  technique SMALLINT NOT NULL CHECK (technique BETWEEN 1 AND 10),
  speed SMALLINT NOT NULL CHECK (speed BETWEEN 1 AND 10),
  motorics SMALLINT NOT NULL CHECK (motorics BETWEEN 1 AND 10),
  endurance SMALLINT NOT NULL CHECK (endurance BETWEEN 1 AND 10),
  strength SMALLINT NOT NULL CHECK (strength BETWEEN 1 AND 10),
  tactics SMALLINT NOT NULL CHECK (tactics BETWEEN 1 AND 10),
  engagement SMALLINT NOT NULL CHECK (engagement BETWEEN 1 AND 10),
  discipline SMALLINT NOT NULL CHECK (discipline BETWEEN 1 AND 10),
  cooperation SMALLINT NOT NULL CHECK (cooperation BETWEEN 1 AND 10),
  average_score NUMERIC(4, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_assessments_player ON public.player_assessments (club_id, player_id, assessed_at DESC);

-- ---------------------------------------------------------------------------
-- Cele rozwojowe
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.player_goal_status NOT NULL DEFAULT 'active',
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER player_goals_set_updated_at
  BEFORE UPDATE ON public.player_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_player_goals_player ON public.player_goals (club_id, player_id, status);

-- ---------------------------------------------------------------------------
-- Testy motoryczne
-- ---------------------------------------------------------------------------

CREATE TABLE public.fitness_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  test_type public.fitness_test_type NOT NULL,
  result_value NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_fitness_tests_player ON public.fitness_tests (club_id, player_id, test_date DESC);

-- ---------------------------------------------------------------------------
-- Przejścia między drużynami / grupami
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_team_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  from_age_group public.academy_age_group,
  to_age_group public.academy_age_group NOT NULL,
  from_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  to_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  transition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transition_type public.team_transition_type NOT NULL DEFAULT 'promotion',
  reason TEXT NOT NULL,
  decision_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_player_team_transitions_player ON public.player_team_transitions (club_id, player_id, transition_date DESC);

-- ---------------------------------------------------------------------------
-- Skauting — zawodnicy zewnętrzni
-- ---------------------------------------------------------------------------

CREATE TABLE public.scouting_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  external_club_name TEXT NOT NULL,
  position public.player_position NOT NULL,
  birth_date DATE,
  age_years INTEGER CHECK (age_years IS NULL OR age_years BETWEEN 5 AND 50),
  status public.scouting_player_status NOT NULL DEFAULT 'observed',
  notes TEXT,
  scouted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  linked_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER scouting_players_set_updated_at
  BEFORE UPDATE ON public.scouting_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_scouting_players_club ON public.scouting_players (club_id, status);

-- ---------------------------------------------------------------------------
-- Baza klubów obserwowanych
-- ---------------------------------------------------------------------------

CREATE TABLE public.scouting_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  club_type public.scouting_club_type NOT NULL DEFAULT 'league_opponent',
  city TEXT,
  contact_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, name)
);

CREATE TRIGGER scouting_clubs_set_updated_at
  BEFORE UPDATE ON public.scouting_clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Raporty skautingowe
-- ---------------------------------------------------------------------------

CREATE TABLE public.scouting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  scouting_player_id UUID REFERENCES public.scouting_players (id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  technique SMALLINT NOT NULL CHECK (technique BETWEEN 1 AND 10),
  motorics SMALLINT NOT NULL CHECK (motorics BETWEEN 1 AND 10),
  tactics SMALLINT NOT NULL CHECK (tactics BETWEEN 1 AND 10),
  character SMALLINT NOT NULL CHECK (character BETWEEN 1 AND 10),
  potential SMALLINT NOT NULL CHECK (potential BETWEEN 1 AND 10),
  final_rating SMALLINT NOT NULL CHECK (final_rating BETWEEN 1 AND 10),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_scouting_reports_club ON public.scouting_reports (club_id, report_date DESC);

-- ---------------------------------------------------------------------------
-- Analiza przeciwników
-- ---------------------------------------------------------------------------

CREATE TABLE public.opponent_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  scouting_club_id UUID REFERENCES public.scouting_clubs (id) ON DELETE SET NULL,
  strengths TEXT NOT NULL DEFAULT '',
  weaknesses TEXT NOT NULL DEFAULT '',
  key_players TEXT NOT NULL DEFAULT '',
  tactical_setup TEXT NOT NULL DEFAULT '',
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER opponent_analysis_set_updated_at
  BEFORE UPDATE ON public.opponent_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_opponent_analysis_club ON public.opponent_analysis (club_id, analysis_date DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_scouting(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_scouting(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_own_development(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      p_player_id = public.player_id_for_user(p_club_id, auth.uid())
      OR p_player_id IN (SELECT public.parent_player_ids(p_club_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_development_row(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.actor_can_read_academy(p_club_id)
    OR public.actor_can_read_own_development(p_club_id, p_player_id);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.academy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_group_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_team_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opponent_analysis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "academy_groups_select" ON public.academy_groups FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id) OR public.actor_can_read_scouting(club_id));
CREATE POLICY "academy_groups_manage" ON public.academy_groups FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "academy_group_staff_select" ON public.academy_group_staff FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id));
CREATE POLICY "academy_group_staff_manage" ON public.academy_group_staff FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_development_select" ON public.player_development FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_development_manage" ON public.player_development FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_development_history_select" ON public.player_development_history FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_development_history_insert" ON public.player_development_history FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_assessments_select" ON public.player_assessments FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_assessments_manage" ON public.player_assessments FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_goals_select" ON public.player_goals FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_goals_manage" ON public.player_goals FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "fitness_tests_select" ON public.fitness_tests FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "fitness_tests_manage" ON public.fitness_tests FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "player_team_transitions_select" ON public.player_team_transitions FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
CREATE POLICY "player_team_transitions_manage" ON public.player_team_transitions FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

CREATE POLICY "scouting_players_select" ON public.scouting_players FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "scouting_players_manage" ON public.scouting_players FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

CREATE POLICY "scouting_clubs_select" ON public.scouting_clubs FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "scouting_clubs_manage" ON public.scouting_clubs FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

CREATE POLICY "scouting_reports_select" ON public.scouting_reports FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "scouting_reports_manage" ON public.scouting_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

CREATE POLICY "opponent_analysis_select" ON public.opponent_analysis FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
CREATE POLICY "opponent_analysis_manage" ON public.opponent_analysis FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));
