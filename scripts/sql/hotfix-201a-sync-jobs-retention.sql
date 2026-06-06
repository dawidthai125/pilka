-- Sprint 20.1 — prune league_sync_jobs older than retention window (no new table).
-- Apply manually on Supabase:
--   psql $DATABASE_URL -f scripts/sql/hotfix-201a-sync-jobs-retention.sql
-- Schedule via pg_cron or external cron (e.g. weekly):
--   SELECT public.platform_prune_league_sync_jobs(90);

BEGIN;

CREATE OR REPLACE FUNCTION public.platform_prune_league_sync_jobs(
  p_retention_days INTEGER DEFAULT 90
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted BIGINT;
  v_cutoff TIMESTAMPTZ;
BEGIN
  IF p_retention_days IS NULL OR p_retention_days < 7 THEN
    RAISE EXCEPTION 'platform_prune_league_sync_jobs: retention_days must be >= 7';
  END IF;

  v_cutoff := timezone('utc', now()) - make_interval(days => p_retention_days);

  DELETE FROM public.league_sync_jobs
  WHERE created_at < v_cutoff;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_prune_league_sync_jobs(INTEGER) FROM PUBLIC;

COMMENT ON FUNCTION public.platform_prune_league_sync_jobs(INTEGER) IS
  'Sprint 20.1: delete league_sync_jobs older than p_retention_days (default 90). '
  'Monitoring UI uses last 50–100 jobs; platform_sync_metrics RPC uses 7-day window.';

COMMIT;
