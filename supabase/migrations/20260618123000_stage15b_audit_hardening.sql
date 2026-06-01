-- ETAP 15B audit hardening: spójność club_id, sezon↔rozgrywki, konflikty, GRANTs

-- ---------------------------------------------------------------------------
-- Rozszerzenie enforce_league_child_club_consistency
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_league_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'league_competitions' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_sources' THEN
    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_sources';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_teams' OR TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id
        AND c.season_id = NEW.season_id
        AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not match competition season';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' THEN
    IF NEW.match_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'match_id does not belong to club_id';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_player_registry' THEN
    IF NEW.player_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'player_id does not belong to club_id';
      END IF;
    END IF;

    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_player_registry';
    END IF;

    IF NEW.season_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id on league_player_registry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_sources_enforce_club ON public.league_sources;
CREATE TRIGGER league_sources_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, club_id ON public.league_sources
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

DROP TRIGGER IF EXISTS league_player_registry_enforce_club ON public.league_player_registry;
CREATE TRIGGER league_player_registry_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, competition_id, season_id, club_id ON public.league_player_registry
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_child_club_consistency();

-- ---------------------------------------------------------------------------
-- league_sync_jobs / league_sync_logs spójność
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_league_sync_job_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_competitions c
    WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'competition_id does not belong to club_id on league_sync_jobs';
  END IF;

  IF NEW.source_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.league_sources s
    WHERE s.id = NEW.source_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'source_id does not belong to club_id on league_sync_jobs';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_sync_jobs_enforce_club ON public.league_sync_jobs;
CREATE TRIGGER league_sync_jobs_enforce_club
  BEFORE INSERT OR UPDATE OF competition_id, source_id, club_id ON public.league_sync_jobs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_sync_job_consistency();

CREATE OR REPLACE FUNCTION public.enforce_league_sync_log_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.league_sync_jobs j
    WHERE j.id = NEW.job_id AND j.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'job_id does not belong to club_id on league_sync_logs';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_sync_logs_enforce_club ON public.league_sync_logs;
CREATE TRIGGER league_sync_logs_enforce_club
  BEFORE INSERT OR UPDATE OF job_id, club_id ON public.league_sync_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_sync_log_consistency();

-- ---------------------------------------------------------------------------
-- league_conflicts spójność + unikalność pending
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_league_conflict_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.league_matches m
    WHERE m.id = NEW.league_match_id AND m.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'league_match_id does not belong to club_id';
  END IF;

  IF NEW.match_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.matches mt
    WHERE mt.id = NEW.match_id AND mt.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'match_id does not belong to club_id on league_conflicts';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status <> 'pending' AND NEW.status = 'pending' THEN
    RAISE EXCEPTION 'cannot reopen resolved league conflict';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS league_conflicts_enforce_club ON public.league_conflicts;
CREATE TRIGGER league_conflicts_enforce_club
  BEFORE INSERT OR UPDATE ON public.league_conflicts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_league_conflict_consistency();

CREATE UNIQUE INDEX IF NOT EXISTS league_conflicts_pending_uniq
  ON public.league_conflicts (league_match_id, field_name)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- GRANT EXECUTE (RLS helpers)
-- ---------------------------------------------------------------------------

GRANT EXECUTE ON FUNCTION public.actor_can_read_league(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_league(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_sync_league(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- Rozdzielenie RLS league_conflicts — sync INSERT, manage UPDATE/DELETE
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS league_conflicts_manage ON public.league_conflicts;

CREATE POLICY league_conflicts_insert ON public.league_conflicts FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_league(club_id));

CREATE POLICY league_conflicts_update ON public.league_conflicts FOR UPDATE TO authenticated
  USING (public.actor_can_manage_league(club_id))
  WITH CHECK (public.actor_can_manage_league(club_id));

CREATE POLICY league_conflicts_delete ON public.league_conflicts FOR DELETE TO authenticated
  USING (public.actor_can_manage_league(club_id));
