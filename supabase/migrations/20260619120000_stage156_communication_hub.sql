-- ETAP 15.6: Communication Hub — ogłoszenia, komunikaty trenera, czaty, powiadomienia

CREATE TYPE public.announcement_category AS ENUM (
  'club',
  'seniors',
  'juniors',
  'trampkarze',
  'mlodzicy',
  'sponsors',
  'board'
);

CREATE TYPE public.announcement_priority AS ENUM (
  'low',
  'normal',
  'high',
  'urgent'
);

CREATE TYPE public.announcement_visibility AS ENUM (
  'all',
  'team',
  'role'
);

CREATE TYPE public.announcement_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE public.coach_message_status AS ENUM (
  'draft',
  'published',
  'archived'
);

CREATE TYPE public.attendance_response AS ENUM (
  'yes',
  'no',
  'unknown'
);

CREATE TYPE public.team_chat_type AS ENUM (
  'team',
  'board',
  'sponsor'
);

CREATE TYPE public.communication_notification_kind AS ENUM (
  'announcement',
  'coach_message',
  'chat_message',
  'training_change',
  'match_change'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'club_announcement';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'coach_message_new';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'chat_message_new';

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category public.announcement_category NOT NULL DEFAULT 'club',
  priority public.announcement_priority NOT NULL DEFAULT 'normal',
  visibility public.announcement_visibility NOT NULL DEFAULT 'all',
  target_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  target_role public.club_role,
  status public.announcement_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.announcement_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  announcement_id UUID NOT NULL REFERENCES public.announcements (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT announcement_reads_unique UNIQUE (announcement_id, user_id)
);

CREATE TABLE public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  status public.coach_message_status NOT NULL DEFAULT 'draft',
  requires_attendance BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  published_at TIMESTAMPTZ,
  ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.coach_message_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  coach_message_id UUID NOT NULL REFERENCES public.coach_messages (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  response public.attendance_response NOT NULL,
  responded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT coach_message_responses_unique UNIQUE (coach_message_id, user_id)
);

CREATE TABLE public.team_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  chat_type public.team_chat_type NOT NULL,
  team_id UUID REFERENCES public.teams (id) ON DELETE CASCADE,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT team_chats_team_required CHECK (
    chat_type <> 'team' OR team_id IS NOT NULL
  ),
  CONSTRAINT team_chats_sponsor_required CHECK (
    chat_type <> 'sponsor' OR sponsor_id IS NOT NULL
  )
);

CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  chat_id UUID NOT NULL REFERENCES public.team_chats (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  body TEXT NOT NULL DEFAULT '',
  is_emoji_only BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.chat_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES public.chat_messages (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE public.notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind public.communication_notification_kind NOT NULL,
  source_id UUID NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  push_queued BOOLEAN NOT NULL DEFAULT FALSE,
  in_app_created BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX announcements_club_status_idx ON public.announcements (club_id, status, published_at DESC);
CREATE INDEX announcements_club_category_idx ON public.announcements (club_id, category);
CREATE INDEX announcement_reads_announcement_idx ON public.announcement_reads (announcement_id);
CREATE INDEX coach_messages_team_idx ON public.coach_messages (club_id, team_id, published_at DESC);
CREATE INDEX coach_message_responses_message_idx ON public.coach_message_responses (coach_message_id);
CREATE INDEX team_chats_club_type_idx ON public.team_chats (club_id, chat_type, is_active);
CREATE INDEX chat_messages_chat_idx ON public.chat_messages (chat_id, created_at DESC);
CREATE INDEX chat_attachments_message_idx ON public.chat_attachments (message_id);
CREATE INDEX notification_events_user_idx ON public.notification_events (club_id, user_id, created_at DESC);

CREATE TRIGGER announcements_set_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER coach_messages_set_updated_at
  BEFORE UPDATE ON public.coach_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER team_chats_set_updated_at
  BEFORE UPDATE ON public.team_chats
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER chat_messages_set_updated_at
  BEFORE UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_communication(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_publish_communication(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_create_coach_messages(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
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
      OR (
        public.actor_can_create_coach_messages(p_club_id)
        AND EXISTS (
          SELECT 1 FROM public.club_memberships cm
          WHERE cm.club_id = p_club_id
            AND cm.user_id = auth.uid()
            AND cm.status = 'active'
            AND (cm.team_id IS NULL OR cm.team_id = t.id)
        )
      )
      OR EXISTS (
        SELECT 1 FROM public.club_memberships cm
        WHERE cm.club_id = p_club_id
          AND cm.user_id = auth.uid()
          AND cm.status = 'active'
          AND cm.team_id = t.id
          AND cm.role IN ('player','coach')
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
          AND public.user_has_club_role(
            a.club_id,
            ARRAY['owner','president','sports_director']::public.club_role[]
          )
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
          AND public.user_has_club_role(
            tc.club_id,
            ARRAY['owner','president','sports_director']::public.club_role[]
          )
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

CREATE OR REPLACE FUNCTION public.enforce_communication_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'announcement_reads' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = NEW.announcement_id AND a.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'announcement_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'coach_message_responses' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.coach_messages cm
      WHERE cm.id = NEW.coach_message_id AND cm.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'coach_message_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'chat_messages' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.team_chats tc
      WHERE tc.id = NEW.chat_id AND tc.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'chat_id does not belong to club_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'chat_attachments' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = NEW.message_id AND m.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'message_id does not belong to club_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER announcement_reads_enforce_club
  BEFORE INSERT OR UPDATE ON public.announcement_reads
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

CREATE TRIGGER coach_message_responses_enforce_club
  BEFORE INSERT OR UPDATE ON public.coach_message_responses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

CREATE TRIGGER chat_messages_enforce_club
  BEFORE INSERT OR UPDATE ON public.chat_messages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

CREATE TRIGGER chat_attachments_enforce_club
  BEFORE INSERT OR UPDATE ON public.chat_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_communication_child_club_consistency();

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coach_message_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY announcements_select ON public.announcements FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_communication(club_id)
      OR (status = 'published' AND public.actor_can_read_announcement(id))
    )
  );

CREATE POLICY announcements_manage ON public.announcements FOR ALL TO authenticated
  USING (public.actor_can_manage_communication(club_id) OR public.actor_can_publish_communication(club_id))
  WITH CHECK (public.actor_can_manage_communication(club_id) OR public.actor_can_publish_communication(club_id));

CREATE POLICY announcement_reads_select ON public.announcement_reads FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      user_id = auth.uid()
      OR public.actor_can_manage_communication(club_id)
    )
  );

CREATE POLICY announcement_reads_insert ON public.announcement_reads FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.actor_can_read_announcement(announcement_id)
  );

CREATE POLICY coach_messages_select ON public.coach_messages FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_communication(club_id)
      OR (
        status = 'published'
        AND team_id IN (SELECT public.actor_communication_team_ids(club_id))
      )
    )
  );

CREATE POLICY coach_messages_manage ON public.coach_messages FOR ALL TO authenticated
  USING (public.actor_can_create_coach_messages(club_id))
  WITH CHECK (public.actor_can_create_coach_messages(club_id));

CREATE POLICY coach_message_responses_select ON public.coach_message_responses FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      user_id = auth.uid()
      OR public.actor_can_create_coach_messages(club_id)
    )
  );

CREATE POLICY coach_message_responses_upsert ON public.coach_message_responses FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.actor_can_create_coach_messages(club_id))
  WITH CHECK (user_id = auth.uid());

CREATE POLICY team_chats_select ON public.team_chats FOR SELECT TO authenticated
  USING (public.actor_can_access_team_chat(id));

CREATE POLICY team_chats_manage ON public.team_chats FOR ALL TO authenticated
  USING (public.actor_can_manage_communication(club_id))
  WITH CHECK (public.actor_can_manage_communication(club_id));

CREATE POLICY chat_messages_select ON public.chat_messages FOR SELECT TO authenticated
  USING (public.actor_can_access_team_chat(chat_id));

CREATE POLICY chat_messages_insert ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND public.actor_can_access_team_chat(chat_id)
  );

CREATE POLICY chat_attachments_select ON public.chat_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id AND public.actor_can_access_team_chat(m.chat_id)
    )
  );

CREATE POLICY chat_attachments_insert ON public.chat_attachments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_messages m
      WHERE m.id = message_id
        AND m.sender_id = auth.uid()
        AND public.actor_can_access_team_chat(m.chat_id)
    )
  );

CREATE POLICY notification_events_select ON public.notification_events FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND club_id IN (SELECT public.user_club_ids()));

CREATE POLICY notification_events_manage ON public.notification_events FOR ALL TO authenticated
  USING (public.actor_can_manage_communication(club_id))
  WITH CHECK (public.actor_can_manage_communication(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcement_reads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_message_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notification_events TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_manage_communication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_publish_communication(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_create_coach_messages(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_communication_team_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_announcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_team_chat(UUID) TO authenticated;
