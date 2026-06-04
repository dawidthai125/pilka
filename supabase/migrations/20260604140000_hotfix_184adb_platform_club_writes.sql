-- Hotfix 18.4a-db — platform writes to protected clubs columns via SECURITY DEFINER RPC.
-- Keeps protect_club_columns for authenticated/leadership; allows server-only platform ops.

BEGIN;

CREATE OR REPLACE FUNCTION public.protect_club_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_setting('fcos.platform_club_write', true) = '1' THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
    OR NEW.slug IS DISTINCT FROM OLD.slug
    OR NEW.country IS DISTINCT FROM OLD.country
    OR NEW.status IS DISTINCT FROM OLD.status
    OR NEW.settings IS DISTINCT FROM OLD.settings
  THEN
    RAISE EXCEPTION 'Cannot modify protected club columns';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.platform_append_club_audit(
  p_club_id UUID,
  p_entry JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_settings JSONB;
  v_existing JSONB;
  v_action TEXT;
BEGIN
  IF p_club_id IS NULL OR p_entry IS NULL THEN
    RAISE EXCEPTION 'platform_append_club_audit: club_id and entry required';
  END IF;

  v_action := p_entry->>'action';
  IF v_action IS NULL OR btrim(v_action) = '' THEN
    RAISE EXCEPTION 'platform_append_club_audit: entry.action required';
  END IF;

  SELECT settings INTO v_settings FROM public.clubs WHERE id = p_club_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'platform_append_club_audit: club not found';
  END IF;

  v_existing := COALESCE(v_settings->'platformAudit', '[]'::jsonb);
  IF jsonb_typeof(v_existing) <> 'array' THEN
    v_existing := '[]'::jsonb;
  END IF;

  PERFORM set_config('fcos.platform_club_write', '1', true);

  UPDATE public.clubs
  SET
    settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{platformAudit}',
      v_existing || jsonb_build_array(p_entry)
    ),
    updated_at = timezone('utc', now())
  WHERE id = p_club_id;

  PERFORM set_config('fcos.platform_club_write', '0', true);
END;
$$;

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

  IF p_status IS NULL OR p_status NOT IN ('active', 'archived') THEN
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

REVOKE ALL ON FUNCTION public.platform_append_club_audit(UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_set_club_status(UUID, TEXT, JSONB) FROM PUBLIC;

COMMIT;
