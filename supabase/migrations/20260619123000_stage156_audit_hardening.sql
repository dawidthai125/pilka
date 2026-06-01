-- ETAP 15.6 audit hardening — Communication Hub

CREATE OR REPLACE FUNCTION public.enforce_announcement_publish_role()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status = 'published' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'published') THEN
    IF NOT public.actor_can_publish_communication(NEW.club_id)
      AND NOT public.actor_can_manage_communication(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to publish announcement';
    END IF;
    IF NEW.published_at IS NULL THEN
      NEW.published_at := timezone('utc', now());
    END IF;
  END IF;

  IF NEW.status = 'archived' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'archived') THEN
    IF NEW.archived_at IS NULL THEN
      NEW.archived_at := timezone('utc', now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER announcements_enforce_publish
  BEFORE INSERT OR UPDATE OF status ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.enforce_announcement_publish_role();

CREATE OR REPLACE FUNCTION public.enforce_coach_message_team_access()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NOT public.actor_can_manage_communication(NEW.club_id)
    AND NOT EXISTS (
      SELECT 1 FROM public.club_memberships cm
      WHERE cm.club_id = NEW.club_id
        AND cm.user_id = auth.uid()
        AND cm.status = 'active'
        AND (cm.team_id IS NULL OR cm.team_id = NEW.team_id)
        AND cm.role = 'coach'
    ) THEN
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

CREATE TRIGGER coach_messages_enforce_team
  BEFORE INSERT OR UPDATE ON public.coach_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_coach_message_team_access();

CREATE UNIQUE INDEX IF NOT EXISTS team_chats_board_unique
  ON public.team_chats (club_id)
  WHERE chat_type = 'board' AND is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS team_chats_team_unique
  ON public.team_chats (club_id, team_id)
  WHERE chat_type = 'team' AND is_active = TRUE;

CREATE UNIQUE INDEX IF NOT EXISTS team_chats_sponsor_unique
  ON public.team_chats (club_id, sponsor_id)
  WHERE chat_type = 'sponsor' AND is_active = TRUE;
