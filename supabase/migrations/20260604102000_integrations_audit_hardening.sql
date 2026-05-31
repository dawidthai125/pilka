-- ETAP 10 audit: GRANTs, spójność club_id, indeksy

-- ---------------------------------------------------------------------------
-- Spójność club_id (defense-in-depth)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_integration_source_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = NEW.integration_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'integration_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integration_sources_enforce_club ON public.integration_sources;
CREATE TRIGGER integration_sources_enforce_club
  BEFORE INSERT OR UPDATE OF integration_id, club_id ON public.integration_sources
  FOR EACH ROW EXECUTE FUNCTION public.enforce_integration_source_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_external_team_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS external_teams_enforce_club ON public.external_teams;
CREATE TRIGGER external_teams_enforce_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.external_teams
  FOR EACH ROW EXECUTE FUNCTION public.enforce_external_team_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_external_match_league_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.external_league_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.external_leagues l
    WHERE l.id = NEW.external_league_id AND l.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'external_league_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS external_matches_enforce_league_club ON public.external_matches;
CREATE TRIGGER external_matches_enforce_league_club
  BEFORE INSERT OR UPDATE OF external_league_id, club_id ON public.external_matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_external_match_league_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sync_log_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.integration_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = NEW.integration_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'integration_id does not belong to club_id on sync_logs';
  END IF;
  IF NEW.sync_job_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sync_jobs j
    WHERE j.id = NEW.sync_job_id AND j.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sync_job_id does not belong to club_id on sync_logs';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_logs_enforce_club ON public.sync_logs;
CREATE TRIGGER sync_logs_enforce_club
  BEFORE INSERT OR UPDATE ON public.sync_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sync_log_club_consistency();

CREATE INDEX IF NOT EXISTS idx_sync_logs_club_status
  ON public.sync_logs (club_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_matches_unsynced
  ON public.external_matches (club_id, competition, season)
  WHERE match_id IS NULL;

-- ---------------------------------------------------------------------------
-- GRANTs (wymagane dla authenticated + RLS)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_club_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_leagues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sync_jobs TO authenticated;
GRANT SELECT, INSERT ON public.sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_conflicts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.integration_imports TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_integrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_integrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_sync_integrations(UUID) TO authenticated;
