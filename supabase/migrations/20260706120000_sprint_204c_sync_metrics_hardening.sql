-- Sprint 20.4C — rozdzielenie metryk mirror_live vs manual_import (Health v2)

BEGIN;

DROP FUNCTION IF EXISTS public.platform_sync_metrics(UUID, TEXT, INTEGER);

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
  has_running_job BOOLEAN,
  last_mirror_live_at TIMESTAMPTZ,
  last_manual_import_at TIMESTAMPTZ,
  mirror_live_freshness_hours NUMERIC,
  manual_import_freshness_hours NUMERIC
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
          AND sj.provider = 'mirror_live'
      ) AS last_mirror,
      MAX(sj.completed_at) FILTER (
        WHERE sj.status = 'completed'
          AND COALESCE(sj.records_failed, 0) = 0
          AND sj.error_message IS NULL
          AND sj.provider = 'manual_import'
      ) AS last_manual,
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
          AND sj.provider = 'mirror_live'
      )::BIGINT AS mirror_success_jobs,
      COUNT(*) FILTER (
        WHERE sj.status IN ('completed', 'failed', 'cancelled')
          AND sj.provider = 'mirror_live'
      )::BIGINT AS mirror_terminal_jobs,
      COUNT(*) FILTER (
        WHERE (sj.status = 'failed' OR sj.error_message IS NOT NULL)
          AND sj.provider = 'mirror_live'
      )::BIGINT AS mirror_failures,
      COUNT(*) FILTER (WHERE sj.provider = 'mirror_live')::BIGINT AS mirror_job_count,
      AVG(sj.duration_ms) FILTER (
        WHERE sj.duration_ms IS NOT NULL AND sj.provider = 'mirror_live'
      ) AS avg_ms,
      PERCENTILE_DISC(0.95) WITHIN GROUP (ORDER BY sj.duration_ms)
        FILTER (WHERE sj.duration_ms IS NOT NULL AND sj.provider = 'mirror_live') AS p95_ms,
      BOOL_OR(
        sj.status IN ('pending', 'running')
        AND sj.created_at >= timezone('utc', now()) - interval '2 hours'
        AND sj.provider = 'mirror_live'
      ) AS running_flag
    FROM scoped_jobs sj
    GROUP BY sj.club_id
  )
  SELECT
    pc.cid,
    pc.last_mirror,
    CASE
      WHEN pc.mirror_terminal_jobs > 0 THEN ROUND(
        (pc.mirror_success_jobs::NUMERIC / pc.mirror_terminal_jobs::NUMERIC) * 100,
        2
      )
      ELSE NULL
    END,
    pc.mirror_failures,
    pc.mirror_job_count,
    CASE
      WHEN pc.last_mirror IS NOT NULL THEN ROUND(
        EXTRACT(EPOCH FROM (timezone('utc', now()) - pc.last_mirror)) / 3600.0,
        2
      )
      ELSE NULL
    END,
    ROUND(pc.avg_ms::NUMERIC, 0),
    ROUND(pc.p95_ms::NUMERIC, 0),
    COALESCE(pc.running_flag, FALSE),
    pc.last_mirror,
    pc.last_manual,
    CASE
      WHEN pc.last_mirror IS NOT NULL THEN ROUND(
        EXTRACT(EPOCH FROM (timezone('utc', now()) - pc.last_mirror)) / 3600.0,
        2
      )
      ELSE NULL
    END,
    CASE
      WHEN pc.last_manual IS NOT NULL THEN ROUND(
        EXTRACT(EPOCH FROM (timezone('utc', now()) - pc.last_manual)) / 3600.0,
        2
      )
      ELSE NULL
    END
  FROM per_club pc
  ORDER BY pc.cid;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_sync_metrics(UUID, TEXT, INTEGER) FROM PUBLIC;

-- Ensure mirror live sources store absolute URLs (legacy shorthand broke fetch).
UPDATE public.league_sources
SET config = config || jsonb_build_object(
  'ninetyMinutUrl', 'http://www.90minut.pl/liga/1/liga14526.html',
  'regionalnyFutbolUrl', 'https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html',
  'sources', jsonb_build_array(
    'http://www.90minut.pl/liga/1/liga14526.html',
    'https://regionalnyfutbol.pl/liga,klasa-b-dolnoslaska-grupa-wroclaw-vii-sezon-2025-2026,tabela-terminarz.html'
  )
)
WHERE is_active = TRUE
  AND name ILIKE 'Mirror live%'
  AND (
    config->>'regionalnyFutbolUrl' IS NULL
    OR config->>'regionalnyFutbolUrl' NOT LIKE 'http%'
    OR config->>'ninetyMinutUrl' IS NULL
    OR config->>'ninetyMinutUrl' NOT LIKE 'http%'
  );

COMMIT;
