-- ETAP 15B: League Hub — centralne zarządzanie rozgrywkami

CREATE TYPE public.league_source_adapter AS ENUM (
  'csv',
  'json',
  'xlsx',
  'api',
  'extranet',
  'manual'
);

CREATE TYPE public.league_sync_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE public.league_import_type AS ENUM (
  'league_table',
  'fixtures',
  'results',
  'full'
);

CREATE TYPE public.league_match_sync_status AS ENUM (
  'pending',
  'synced',
  'conflict',
  'error',
  'skipped'
);

CREATE TYPE public.league_conflict_status AS ENUM (
  'pending',
  'keep_local',
  'keep_external',
  'merged',
  'dismissed'
);

CREATE TABLE public.league_seasons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, name)
);

CREATE TABLE public.league_competitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.league_seasons (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category_label TEXT,
  provider TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, season_id, name)
);

CREATE TABLE public.league_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID REFERENCES public.league_competitions (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  adapter public.league_source_adapter NOT NULL DEFAULT 'manual',
  provider_label TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.league_competitions (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  league_name TEXT NOT NULL,
  external_id TEXT,
  is_own_club BOOLEAN NOT NULL DEFAULT FALSE,
  provider TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, competition_id, league_name)
);

CREATE TABLE public.league_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.league_sources (id) ON DELETE SET NULL,
  competition_id UUID REFERENCES public.league_competitions (id) ON DELETE SET NULL,
  import_type public.league_import_type NOT NULL,
  status public.league_sync_status NOT NULL DEFAULT 'pending',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  records_conflicts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  triggered_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.league_sync_jobs (id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.league_competitions (id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.league_seasons (id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.league_sources (id) ON DELETE SET NULL,
  sync_job_id UUID REFERENCES public.league_sync_jobs (id) ON DELETE SET NULL,
  snapshot_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  team_name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  played INTEGER NOT NULL DEFAULT 0,
  won INTEGER NOT NULL DEFAULT 0,
  drawn INTEGER NOT NULL DEFAULT 0,
  lost INTEGER NOT NULL DEFAULT 0,
  goals_for INTEGER NOT NULL DEFAULT 0,
  goals_against INTEGER NOT NULL DEFAULT 0,
  goal_difference INTEGER NOT NULL DEFAULT 0,
  points INTEGER NOT NULL DEFAULT 0,
  is_own_club BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE public.league_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID NOT NULL REFERENCES public.league_competitions (id) ON DELETE CASCADE,
  season_id UUID NOT NULL REFERENCES public.league_seasons (id) ON DELETE CASCADE,
  source_id UUID REFERENCES public.league_sources (id) ON DELETE SET NULL,
  sync_job_id UUID REFERENCES public.league_sync_jobs (id) ON DELETE SET NULL,
  external_key TEXT NOT NULL,
  round_number INTEGER,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL DEFAULT '15:00',
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  sync_status public.league_match_sync_status NOT NULL DEFAULT 'pending',
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, competition_id, external_key)
);

CREATE TABLE public.league_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  league_match_id UUID NOT NULL REFERENCES public.league_matches (id) ON DELETE CASCADE,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  local_value TEXT,
  external_value TEXT,
  status public.league_conflict_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.league_player_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  competition_id UUID REFERENCES public.league_competitions (id) ON DELETE SET NULL,
  season_id UUID REFERENCES public.league_seasons (id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  league_player_name TEXT NOT NULL,
  league_team_name TEXT,
  external_id TEXT,
  jersey_number INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX league_seasons_club_idx ON public.league_seasons (club_id, is_active);
CREATE INDEX league_competitions_season_idx ON public.league_competitions (club_id, season_id);
CREATE INDEX league_teams_competition_idx ON public.league_teams (club_id, competition_id);
CREATE INDEX league_tables_snapshot_idx ON public.league_tables (club_id, competition_id, snapshot_at DESC);
CREATE INDEX league_matches_date_idx ON public.league_matches (club_id, competition_id, match_date);
CREATE INDEX league_matches_sync_idx ON public.league_matches (club_id, sync_status);
CREATE INDEX league_sync_jobs_club_idx ON public.league_sync_jobs (club_id, created_at DESC);
CREATE INDEX league_sync_logs_job_idx ON public.league_sync_logs (job_id, created_at);
CREATE INDEX league_conflicts_pending_idx ON public.league_conflicts (club_id, status) WHERE status = 'pending';
CREATE INDEX league_player_registry_club_idx ON public.league_player_registry (club_id, league_player_name);

CREATE TRIGGER league_seasons_set_updated_at
  BEFORE UPDATE ON public.league_seasons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_competitions_set_updated_at
  BEFORE UPDATE ON public.league_competitions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_sources_set_updated_at
  BEFORE UPDATE ON public.league_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_teams_set_updated_at
  BEFORE UPDATE ON public.league_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_matches_set_updated_at
  BEFORE UPDATE ON public.league_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER league_player_registry_set_updated_at
  BEFORE UPDATE ON public.league_player_registry
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC
CREATE OR REPLACE FUNCTION public.actor_can_read_league(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','player']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_league(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_sync_league(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_league(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.enforce_league_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'league_competitions' THEN
    IF NOT EXISTS (SELECT 1 FROM public.league_seasons s WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'league_teams' OR TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (SELECT 1 FROM public.league_competitions c WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (SELECT 1 FROM public.league_seasons s WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'league_matches' THEN
    IF NEW.match_id IS NOT NULL THEN
      IF NOT EXISTS (SELECT 1 FROM public.matches m WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id) THEN
        RAISE EXCEPTION 'match_id does not belong to club_id';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER league_competitions_enforce_club
  BEFORE INSERT OR UPDATE OF season_id, club_id ON public.league_competitions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

CREATE TRIGGER league_teams_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, club_id ON public.league_teams
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

CREATE TRIGGER league_matches_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, season_id, match_id, club_id ON public.league_matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

CREATE TRIGGER league_tables_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, season_id, club_id ON public.league_tables
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

-- RLS
ALTER TABLE public.league_seasons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.league_player_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY league_seasons_select ON public.league_seasons FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_seasons_manage ON public.league_seasons FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_competitions_select ON public.league_competitions FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_competitions_manage ON public.league_competitions FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_sources_select ON public.league_sources FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_sources_manage ON public.league_sources FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_teams_select ON public.league_teams FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_teams_manage ON public.league_teams FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_sync_jobs_select ON public.league_sync_jobs FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_sync_jobs_insert ON public.league_sync_jobs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_league(club_id));
CREATE POLICY league_sync_jobs_update ON public.league_sync_jobs FOR UPDATE TO authenticated
  USING (public.actor_can_sync_league(club_id))
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_sync_logs_select ON public.league_sync_logs FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_sync_logs_insert ON public.league_sync_logs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_tables_select ON public.league_tables FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_tables_manage ON public.league_tables FOR ALL TO authenticated
  USING (public.actor_can_sync_league(club_id))
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_matches_select ON public.league_matches FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_matches_manage ON public.league_matches FOR ALL TO authenticated
  USING (public.actor_can_sync_league(club_id))
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_conflicts_select ON public.league_conflicts FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_conflicts_manage ON public.league_conflicts FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_player_registry_select ON public.league_player_registry FOR SELECT TO authenticated
  USING (public.actor_can_read_league(club_id));
CREATE POLICY league_player_registry_manage ON public.league_player_registry FOR ALL TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_seasons TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_competitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.league_sync_jobs TO authenticated;
GRANT SELECT, INSERT ON public.league_sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_conflicts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.league_player_registry TO authenticated;
