-- Sprint 19.2B — extend existing platform_set_club_status (NOT a new RPC).
-- Apply manually on Supabase before using Restore in Platform Admin:
--   psql $DATABASE_URL -f scripts/sql/hotfix-192b-platform-restore-club.sql

BEGIN;

CREATE OR REPLACE FUNCTION public.platform_set_club_status(
  p_club_id UUID,
  p_status TEXT,
  p_audit_entry JSONB DEFAULT NULL
)
RETURNS TABLE (
  out_club_id UUID,
  out_slug TEXT,
  out_public_name TEXT,
  out_previous_status TEXT,
  out_noop BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_status TEXT;
  v_slug TEXT;
  v_public_name TEXT;
  v_settings JSONB;
  v_existing JSONB;
  v_new_settings JSONB;
BEGIN
  IF p_club_id IS NULL THEN
    RAISE EXCEPTION 'platform_set_club_status: club_id required';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('active', 'archived', 'onboarding') THEN
    RAISE EXCEPTION 'platform_set_club_status: invalid target status';
  END IF;

  SELECT c.status, c.slug, c.public_name, c.settings
  INTO v_old_status, v_slug, v_public_name, v_settings
  FROM public.clubs c
  WHERE c.id = p_club_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'platform_set_club_status: club not found';
  END IF;

  IF v_old_status = p_status THEN
    RETURN QUERY
    SELECT p_club_id, v_slug, v_public_name, v_old_status, TRUE;
    RETURN;
  END IF;

  IF p_status = 'active' AND v_old_status <> 'onboarding' THEN
    RAISE EXCEPTION 'platform_set_club_status: can only activate from onboarding (current: %)', v_old_status;
  END IF;

  IF p_status = 'onboarding' AND v_old_status <> 'archived' THEN
    RAISE EXCEPTION 'platform_set_club_status: can only restore to onboarding from archived (current: %)', v_old_status;
  END IF;

  IF p_status = 'archived' AND v_old_status NOT IN ('active', 'onboarding') THEN
    RAISE EXCEPTION 'platform_set_club_status: cannot archive from status %', v_old_status;
  END IF;

  v_new_settings := COALESCE(v_settings, '{}'::jsonb);

  IF p_audit_entry IS NOT NULL THEN
    v_existing := COALESCE(v_new_settings->'platformAudit', '[]'::jsonb);
    IF jsonb_typeof(v_existing) <> 'array' THEN
      v_existing := '[]'::jsonb;
    END IF;
    IF p_audit_entry->>'action' IS NULL OR btrim(p_audit_entry->>'action') = '' THEN
      RAISE EXCEPTION 'platform_set_club_status: audit entry.action required';
    END IF;
    v_new_settings := jsonb_set(v_new_settings, '{platformAudit}', v_existing || jsonb_build_array(p_audit_entry));
  END IF;

  PERFORM set_config('fcos.platform_club_write', '1', true);

  UPDATE public.clubs
  SET
    status = p_status,
    settings = v_new_settings,
    updated_at = timezone('utc', now())
  WHERE id = p_club_id;

  PERFORM set_config('fcos.platform_club_write', '0', true);

  RETURN QUERY
  SELECT p_club_id, v_slug, v_public_name, v_old_status, FALSE;
END;
$$;

REVOKE ALL ON FUNCTION public.platform_set_club_status(UUID, TEXT, JSONB) FROM PUBLIC;

COMMIT;
