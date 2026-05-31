-- Security hardening: least-privilege GRANTs, role assignment guards, column protection

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

CREATE OR REPLACE FUNCTION public.actor_is_owner(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.user_has_club_role(p_club_id, ARRAY['owner']::public.club_role[]);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_assign_role(
  p_club_id UUID,
  p_target_role public.club_role
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.actor_is_owner(p_club_id) THEN
    RETURN TRUE;
  END IF;

  IF p_target_role = 'owner' THEN
    RETURN FALSE;
  END IF;

  RETURN public.user_has_club_role(
    p_club_id,
    ARRAY['president', 'sports_director']::public.club_role[]
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Cannot modify protected profile columns';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_protect_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_columns();

CREATE OR REPLACE FUNCTION public.protect_club_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
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

CREATE TRIGGER clubs_protect_columns
  BEFORE UPDATE ON public.clubs
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_club_columns();

DROP POLICY IF EXISTS "memberships_manage_leadership" ON public.club_memberships;

CREATE POLICY "memberships_insert_leadership"
  ON public.club_memberships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.actor_can_assign_role(club_id, role)
    AND public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[])
  );

CREATE POLICY "memberships_update_leadership"
  ON public.club_memberships
  FOR UPDATE
  TO authenticated
  USING (
    public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[])
  )
  WITH CHECK (
    public.actor_can_assign_role(club_id, role)
    AND public.user_has_club_role(club_id, ARRAY['owner', 'president', 'sports_director']::public.club_role[])
  );

CREATE POLICY "memberships_delete_leadership"
  ON public.club_memberships
  FOR DELETE
  TO authenticated
  USING (
    public.actor_is_owner(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['president', 'sports_director']::public.club_role[])
      AND role <> 'owner'
    )
  );

DROP FUNCTION IF EXISTS public.user_has_club_permission(UUID, public.club_role[]);
