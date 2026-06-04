-- Sprint 18.5A — League sync foundation (jobs columns, indexes, platform_sync_metrics RPC)

BEGIN;

ALTER TABLE public.league_sync_jobs
  ADD COLUMN IF NOT EXISTS provider TEXT,
  ADD COLUMN IF NOT EXISTS trigger_source TEXT,
  ADD COLUMN IF NOT EXISTS duration_ms INTEGER;

ALTER TABLE public.league_sync_jobs
  DROP CONSTRAINT IF EXISTS league_sync_jobs_provider_check;

ALTER TABLE public.league_sync_jobs
  ADD CONSTRAINT league_sync_jobs_provider_check
  CHECK (
    provider IS NULL
    OR provider IN ('mirror_live', 'manual_import', 'unknown')
  );

ALTER TABLE public.league_sync_jobs
  DROP CONSTRAINT IF EXISTS league_sync_jobs_trigger_source_check;

ALTER TABLE public.league_sync_jobs
  ADD CONSTRAINT league_sync_jobs_trigger_source_check
  CHECK (
    trigger_source IS NULL
    OR trigger_source IN ('cron', 'platform_admin', 'club_user', 'import', 'cli', 'unknown')
  );

ALTER TABLE public.league_sync_jobs
  DROP CONSTRAINT IF EXISTS league_sync_jobs_duration_ms_check;

ALTER TABLE public.league_sync_jobs
  ADD CONSTRAINT league_sync_jobs_duration_ms_check
  CHECK (duration_ms IS NULL OR duration_ms >= 0);

-- Backfill existing rows (best-effort)
UPDATE public.league_sync_jobs j
SET provider = COALESCE(
  NULLIF(btrim(j.provider), ''),
  CASE
    WHEN j.metadata->>'adapter' IN ('mirror_live', 'manual_import') THEN j.metadata->>'adapter'
    WHEN j.metadata->>'adapter' = 'cli-fixture' THEN 'manual_import'
    ELSE NULL
  END,
  (
    SELECT NULLIF(btrim(s.config->>'provider'), '')
    FROM public.league_sources s
    WHERE s.id = j.source_id
  ),
  'unknown'
)
WHERE j.provider IS NULL;

UPDATE public.league_sync_jobs j
SET trigger_source = COALESCE(
  NULLIF(btrim(j.trigger_source), ''),
  CASE
    WHEN j.metadata->>'activatedVia' = 'platform_league_wizard' THEN 'platform_admin'
    WHEN j.metadata ? 'fileName' OR j.metadata->>'adapter' = 'cli-fixture' THEN 'import'
    WHEN j.triggered_by IS NOT NULL THEN 'club_user'
    WHEN j.metadata->>'adapter' = 'mirror_live' OR j.provider = 'mirror_live' THEN 'cron'
    ELSE 'unknown'
  END
)
WHERE j.trigger_source IS NULL;

UPDATE public.league_sync_jobs j
SET duration_ms = GREATEST(
  0,
  (
    EXTRACT(
      EPOCH
      FROM (
        j.completed_at - COALESCE(j.started_at, j.created_at)
      )
    ) * 1000
  )::INTEGER
)
WHERE j.duration_ms IS NULL
  AND j.completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS league_sync_jobs_created_at_idx
  ON public.league_sync_jobs (created_at DESC);

CREATE INDEX IF NOT EXISTS league_sync_jobs_club_status_created_idx
  ON public.league_sync_jobs (club_id, status, created_at DESC);

CREATE OR REPLACE FUNCTION public.platform_sync_metrics(
  p_club_id UUID DEFAULT NULL,
  p_provider TEXT DEFAULT NULL,
  p_window_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  out_club_id UUID,
  last_success_at TIMESTAMPTZ,
  success_rate NUMERIC,
  failed_count BIGINT,
  job_count BIGINT,
  freshness_hours NUMERIC,
  avg_duration_ms NUMERIC,
  p95_duration_ms NUMERIC,
  has_running_job BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days INTEGER;
  v_since TIMESTAMPTZ;
BEGIN
  v_days := GREATEST(1, LEAST(COALESCE(p_window_days, 7), 90));
  v_since := timezone('utc', now()) - make_interval(days => v_days);

  RETURN QUERY
  WITH scoped_jobs AS (
    SELECT
      j.club_id,
      j.status,
      j.records_failed,
      j.error_message,
      j.started_at,
      j.completed_at,
      j.created_at,
      j.duration_ms,
      j.provider
    FROM public.league_sync_jobs j
    WHERE j.created_at >= v_since
      AND (p_club_id IS NULL OR j.club_id = p_club_id)
      AND (
        p_provider IS NULL
        OR btrim(p_provider) = ''
        OR j.provider = p_provider
      )
  ),
  per_club AS (
    SELECT
      sj.club_id AS cid,
      MAX(sj.completed_at) FILTER (
        WHERE sj.status = 'completed'
          AND COALESCE(sj.records_failed, 0) = 0
          AND sj.error_message IS NULL
      ) AS last_ok,
      COUNT(*)::BIGINT AS total_jobs,
      COUNT(*) FILTER (
        WHERE sj.status = 'failed'
          OR sj.error_message IS NOT NULL
      )::BIGINT AS failures,
      COUNT(*) FILTER (
        WHERE sj.status IN ('completed', 'failed', 'cancelled')
      )::BIGINT AS terminal_jobs,
      COUNT(*) FILTER (
        WHERE sj.status = 'completed'
          AND COALESCE(sj.records_failed, 0) = 0
          AND sj.error_message IS NULL
      )::BIGINT AS success_jobs,
      AVG(sj.duration_ms) FILTER (WHERE sj.duration_ms IS NOT NULL) AS avg_ms,
      PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY sj.duration_ms)
        FILTER (WHERE sj.duration_ms IS NOT NULL) AS p95_ms,
      BOOL_OR(
        sj.status IN ('pending', 'running')
        AND sj.created_at >= timezone('utc', now()) - interval '2 hours'
      ) AS running_flag
    FROM scoped_jobs sj
    GROUP BY sj.club_id
  )
  SELECT
    pc.cid,
    pc.last_ok,
    CASE
      WHEN pc.terminal_jobs > 0 THEN ROUND((pc.success_jobs::NUMERIC / pc.terminal_jobs::NUMERIC) * 100, 2)
      ELSE NULL
    END,
    pc.failures,
    pc.total_jobs,
    CASE
      WHEN pc.last_ok IS NOT NULL THEN ROUND(
        EXTRACT(EPOCH FROM (timezone('utc', now()) - pc.last_ok)) / 3600.0,
        2
      )
      ELSE NULL
    END,
    ROUND(pc.avg_ms::NUMERIC, 0),
    ROUND(pc.p95_ms::NUMERIC, 0),
    COALESCE(pc.running_flag, FALSE)
  FROM per_club pc
  ORDER BY pc.cid;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_sync_metrics(UUID, TEXT, INTEGER) FROM PUBLIC;

COMMIT;
