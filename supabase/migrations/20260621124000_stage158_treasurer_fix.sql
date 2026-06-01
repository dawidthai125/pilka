-- Fix actor_can_manage_crm treasurer enum cast on DB without treasurer role

CREATE OR REPLACE FUNCTION public.actor_can_manage_crm(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN FALSE;
  END IF;

  IF public.user_has_club_role(
    p_club_id,
    ARRAY['owner', 'president', 'sports_director']::public.club_role[]
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'club_role' AND e.enumlabel = 'treasurer'
  ) AND EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.club_id = p_club_id
      AND cm.user_id = auth.uid()
      AND cm.status = 'active'
      AND cm.role::text = 'treasurer'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;
