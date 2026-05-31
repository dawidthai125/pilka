-- ETAP 10: Integracje z systemami rozgrywkowymi (PZPN, DZPN, Extranet, importy)

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'integrations';

CREATE TYPE public.integration_provider AS ENUM (
  'pzpn',
  'dzpn',
  'extranet',
  'manual',
  'other'
);

CREATE TYPE public.integration_data_format AS ENUM (
  'api',
  'json',
  'xml',
  'csv',
  'rss',
  'file',
  'manual'
);

CREATE TYPE public.integration_connection_status AS ENUM (
  'not_configured',
  'ready',
  'disabled',
  'error'
);

CREATE TYPE public.sync_job_type AS ENUM (
  'league_table',
  'fixtures',
  'results',
  'full'
);

CREATE TYPE public.sync_trigger_type AS ENUM (
  'manual',
  'automatic',
  'import'
);

CREATE TYPE public.sync_job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);

CREATE TYPE public.sync_log_status AS ENUM (
  'success',
  'partial',
  'error'
);

CREATE TYPE public.sync_conflict_status AS ENUM (
  'pending',
  'keep_local',
  'keep_external',
  'merged',
  'dismissed'
);

CREATE TYPE public.integration_import_type AS ENUM (
  'league_table',
  'fixtures',
  'results'
);

CREATE TYPE public.integration_import_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'partial'
);

-- ---------------------------------------------------------------------------
-- Konfiguracja integracji (jedna na provider × klub)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  status public.integration_connection_status NOT NULL DEFAULT 'not_configured',
  base_url TEXT,
  api_key_configured BOOLEAN NOT NULL DEFAULT FALSE,
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auto_sync_interval_minutes INTEGER NOT NULL DEFAULT 1440 CHECK (auto_sync_interval_minutes >= 15),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider)
);

CREATE TRIGGER integrations_set_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_integrations_club ON public.integrations (club_id);

-- ---------------------------------------------------------------------------
-- Źródła danych (API, pliki, RSS, ręczne)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integration_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format public.integration_data_format NOT NULL DEFAULT 'manual',
  source_url TEXT,
  file_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TRIGGER integration_sources_set_updated_at
  BEFORE UPDATE ON public.integration_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_integration_sources_club ON public.integration_sources (club_id, integration_id);

-- ---------------------------------------------------------------------------
-- Mapowanie nazw klubu (Piorun Wawrzeńczyce ↔ GLKS Mietków)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integration_club_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  public_name TEXT NOT NULL,
  league_name TEXT NOT NULL,
  external_club_id TEXT,
  provider public.integration_provider,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, public_name, league_name)
);

CREATE TRIGGER integration_club_mappings_set_updated_at
  BEFORE UPDATE ON public.integration_club_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Zewnętrzne ligi / rozgrywki
-- ---------------------------------------------------------------------------

CREATE TABLE public.external_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  external_name TEXT NOT NULL,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id, season)
);

CREATE TRIGGER external_leagues_set_updated_at
  BEFORE UPDATE ON public.external_leagues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Mapowanie drużyn (Seniorzy, Juniorzy, …)
-- ---------------------------------------------------------------------------

CREATE TABLE public.external_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  external_name TEXT NOT NULL,
  category_label TEXT NOT NULL,
  competition TEXT,
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id, season)
);

CREATE TRIGGER external_teams_set_updated_at
  BEFORE UPDATE ON public.external_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_external_teams_club ON public.external_teams (club_id, team_id);

-- ---------------------------------------------------------------------------
-- Zewnętrzne mecze (staging przed synchronizacją)
-- ---------------------------------------------------------------------------

CREATE TABLE public.external_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  external_league_id UUID REFERENCES public.external_leagues (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  round_number INTEGER,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL DEFAULT '15:00',
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id)
);

CREATE TRIGGER external_matches_set_updated_at
  BEFORE UPDATE ON public.external_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_external_matches_club_date ON public.external_matches (club_id, match_date DESC);

-- ---------------------------------------------------------------------------
-- Zadania synchronizacji
-- ---------------------------------------------------------------------------

CREATE TABLE public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations (id) ON DELETE SET NULL,
  job_type public.sync_job_type NOT NULL,
  trigger_type public.sync_trigger_type NOT NULL DEFAULT 'manual',
  status public.sync_job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sync_jobs_club ON public.sync_jobs (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Logi synchronizacji
-- ---------------------------------------------------------------------------

CREATE TABLE public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations (id) ON DELETE SET NULL,
  sync_job_id UUID REFERENCES public.sync_jobs (id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.integration_sources (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  job_type public.sync_job_type NOT NULL,
  trigger_type public.sync_trigger_type NOT NULL DEFAULT 'manual',
  status public.sync_log_status NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  quality_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX idx_sync_logs_club ON public.sync_logs (club_id, started_at DESC);
CREATE INDEX idx_sync_logs_status ON public.sync_logs (club_id, status);

-- ---------------------------------------------------------------------------
-- Konflikty synchronizacji (administrator decyduje)
-- ---------------------------------------------------------------------------

CREATE TABLE public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sync_log_id UUID NOT NULL REFERENCES public.sync_logs (id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  local_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.sync_conflict_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sync_conflicts_pending ON public.sync_conflicts (club_id, status)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Import plików (CSV, JSON, …)
-- ---------------------------------------------------------------------------

CREATE TABLE public.integration_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  format public.integration_data_format NOT NULL,
  import_type public.integration_import_type NOT NULL,
  status public.integration_import_status NOT NULL DEFAULT 'pending',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  quality_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_log_id UUID REFERENCES public.sync_logs (id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_integration_imports_club ON public.integration_imports (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_sync_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_integrations(p_club_id);
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_club_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "integrations_select" ON public.integrations FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integrations_manage" ON public.integrations FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "integration_sources_select" ON public.integration_sources FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integration_sources_manage" ON public.integration_sources FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "integration_club_mappings_select" ON public.integration_club_mappings FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integration_club_mappings_manage" ON public.integration_club_mappings FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "external_leagues_select" ON public.external_leagues FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "external_leagues_manage" ON public.external_leagues FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "external_teams_select" ON public.external_teams FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "external_teams_manage" ON public.external_teams FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "external_matches_select" ON public.external_matches FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "external_matches_manage" ON public.external_matches FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "sync_jobs_select" ON public.sync_jobs FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "sync_jobs_insert" ON public.sync_jobs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "sync_jobs_update" ON public.sync_jobs FOR UPDATE TO authenticated
  USING (public.actor_can_sync_integrations(club_id))
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "sync_logs_select" ON public.sync_logs FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "sync_logs_insert" ON public.sync_logs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "sync_conflicts_select" ON public.sync_conflicts FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "sync_conflicts_manage" ON public.sync_conflicts FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

CREATE POLICY "integration_imports_select" ON public.integration_imports FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

CREATE POLICY "integration_imports_insert" ON public.integration_imports FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

CREATE POLICY "integration_imports_update" ON public.integration_imports FOR UPDATE TO authenticated
  USING (public.actor_can_sync_integrations(club_id))
  WITH CHECK (public.actor_can_sync_integrations(club_id));
