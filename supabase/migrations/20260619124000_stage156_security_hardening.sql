-- ETAP 15.6 security hardening — izolacja drużyn, RSVP, coach messages, board access

CREATE OR REPLACE FUNCTION public.actor_can_access_board_communication(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN FALSE;
  END IF;

  IF public.user_has_club_role(
    p_club_id,
    ARRAY['owner','president','sports_director']::public.club_role[]
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
      AND t.typname = 'club_role'
      AND e.enumlabel = 'treasurer'
  ) THEN
    RETURN public.user_has_club_role(p_club_id, ARRAY['treasurer']::public.club_role[]);
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.actor_communication_team_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.id
  FROM public.teams t
  WHERE t.club_id = p_club_id
    AND (
      public.actor_can_manage_communication(p_club_id)
      OR EXISTS (
        SELECT 1 FROM public.club_memberships cm
        WHERE cm.club_id = p_club_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cm.team_id = t.id
          AND cm.role IN ('player','coach','parent')
      )
    );

  IF to_regclass('public.player_guardians') IS NOT NULL THEN
    RETURN QUERY EXECUTE $guardian$
      SELECT DISTINCT t.id
      FROM public.teams t
      WHERE t.club_id = $1
        AND EXISTS (
          SELECT 1
          FROM public.player_guardians pg
          JOIN public.players p ON p.id = pg.player_id AND p.club_id = pg.club_id
          WHERE pg.club_id = $1
            AND pg.profile_id = auth.uid()
            AND p.team_id = t.id
        )
    $guardian$ USING p_club_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_modify_coach_message(p_club_id UUID, p_team_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_communication(p_club_id)
      OR (
        public.actor_can_create_coach_messages(p_club_id)
        AND EXISTS (
          SELECT 1 FROM public.club_memberships cm
          WHERE cm.club_id = p_club_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND cm.role = 'coach'
            AND cm.team_id = p_team_id
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_respond_coach_message(p_coach_message_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.coach_messages cm
    WHERE cm.id = p_coach_message_id
      AND cm.club_id IN (SELECT public.user_club_ids())
      AND cm.status = 'published'
      AND cm.team_id IN (SELECT public.actor_communication_team_ids(cm.club_id))
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_announcement(p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.announcements a
    WHERE a.id = p_announcement_id
      AND a.club_id IN (SELECT public.user_club_ids())
      AND a.status = 'published'
      AND (
        public.actor_can_manage_communication(a.club_id)
        OR (
          a.visibility = 'all'
          AND NOT public.actor_is_sponsor_user(a.club_id)
        )
        OR (
          a.visibility = 'team'
          AND a.target_team_id IS NOT NULL
          AND a.target_team_id IN (SELECT public.actor_communication_team_ids(a.club_id))
        )
        OR (
          a.visibility = 'role'
          AND a.target_role IS NOT NULL
          AND public.user_has_club_role(a.club_id, ARRAY[a.target_role]::public.club_role[])
        )
        OR (
          a.category = 'sponsors'
          AND public.actor_is_sponsor_user(a.club_id)
        )
        OR (
          a.category = 'board'
          AND public.actor_can_access_board_communication(a.club_id)
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_team_chat(p_chat_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_chats tc
    WHERE tc.id = p_chat_id
      AND tc.club_id IN (SELECT public.user_club_ids())
      AND tc.is_active = TRUE
      AND (
        (
          tc.chat_type = 'board'
          AND public.actor_can_access_board_communication(tc.club_id)
        )
        OR (
          tc.chat_type = 'team'
          AND tc.team_id IN (SELECT public.actor_communication_team_ids(tc.club_id))
        )
        OR (
          tc.chat_type = 'sponsor'
          AND public.actor_is_sponsor_user(tc.club_id)
          AND tc.sponsor_id = public.sponsor_id_for_user(tc.club_id, auth.uid())
        )
        OR public.actor_can_manage_communication(tc.club_id)
      )
  );
$$;

DROP POLICY IF EXISTS coach_messages_manage ON public.coach_messages;
CREATE POLICY coach_messages_manage ON public.coach_messages FOR ALL TO authenticated
  USING (public.actor_can_modify_coach_message(club_id, team_id))
  WITH CHECK (public.actor_can_modify_coach_message(club_id, team_id));

DROP POLICY IF EXISTS coach_message_responses_upsert ON public.coach_message_responses;
DROP POLICY IF EXISTS coach_message_responses_insert ON public.coach_message_responses;
DROP POLICY IF EXISTS coach_message_responses_update ON public.coach_message_responses;
CREATE POLICY coach_message_responses_insert ON public.coach_message_responses FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_coach_message(coach_message_id)
  );

CREATE POLICY coach_message_responses_update ON public.coach_message_responses FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_respond_coach_message(coach_message_id)
  );

GRANT EXECUTE ON FUNCTION public.actor_can_access_board_communication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_modify_coach_message(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_respond_coach_message(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.enforce_coach_message_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.actor_can_modify_coach_message(NEW.club_id, NEW.team_id) THEN
    RAISE EXCEPTION 'coach cannot post to this team';
  END IF;

  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
