-- ETAP 15.8: Club CRM & Relationship Management

CREATE TYPE public.crm_contact_type AS ENUM (
  'sponsor',
  'partner',
  'parent',
  'volunteer',
  'donor',
  'company',
  'institution',
  'media'
);

CREATE TYPE public.crm_pipeline_status AS ENUM (
  'new_contact',
  'conversation',
  'offer_sent',
  'negotiation',
  'active_sponsor',
  'lost'
);

CREATE TYPE public.crm_interaction_type AS ENUM (
  'meeting',
  'phone',
  'email',
  'event',
  'sponsorship'
);

CREATE TYPE public.crm_task_type AS ENUM (
  'call_back',
  'send_offer',
  'meeting',
  'reminder'
);

CREATE TYPE public.crm_task_status AS ENUM (
  'open',
  'done',
  'cancelled'
);

CREATE TYPE public.crm_event_type AS ENUM (
  'tournament',
  'club_picnic',
  'sponsor_meeting',
  'parent_meeting',
  'other'
);

CREATE TYPE public.crm_volunteer_area AS ENUM (
  'match_help',
  'transport',
  'event_org',
  'tournament_ops'
);

CREATE TYPE public.crm_event_rsvp AS ENUM (
  'invited',
  'confirmed',
  'declined',
  'attended'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'crm_task_reminder';

CREATE TABLE public.crm_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_type public.crm_contact_type NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  website TEXT,
  notes TEXT,
  pipeline_status public.crm_pipeline_status NOT NULL DEFAULT 'new_contact',
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  partner_services TEXT,
  partner_discounts TEXT,
  volunteer_areas public.crm_volunteer_area[] NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_contacts_club_type_idx ON public.crm_contacts (club_id, contact_type, is_active);
CREATE INDEX crm_contacts_pipeline_idx ON public.crm_contacts (club_id, pipeline_status);
CREATE INDEX crm_contacts_profile_idx ON public.crm_contacts (club_id, profile_id) WHERE profile_id IS NOT NULL;

CREATE TABLE public.crm_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES public.crm_contacts (id) ON DELETE CASCADE,
  interaction_type public.crm_interaction_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_interactions_contact_idx ON public.crm_interactions (contact_id, occurred_at DESC);

CREATE TABLE public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts (id) ON DELETE SET NULL,
  task_type public.crm_task_type NOT NULL,
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ,
  status public.crm_task_status NOT NULL DEFAULT 'open',
  notify_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_tasks_club_due_idx ON public.crm_tasks (club_id, status, due_at);

CREATE TABLE public.crm_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  event_type public.crm_event_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_events_club_starts_idx ON public.crm_events (club_id, starts_at DESC);

CREATE TABLE public.crm_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.crm_events (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts (id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE CASCADE,
  rsvp_status public.crm_event_rsvp NOT NULL DEFAULT 'invited',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT crm_event_attendees_target_check CHECK (
    contact_id IS NOT NULL OR profile_id IS NOT NULL
  ),
  CONSTRAINT crm_event_attendees_contact_unique UNIQUE (event_id, contact_id),
  CONSTRAINT crm_event_attendees_profile_unique UNIQUE (event_id, profile_id)
);

CREATE TABLE public.crm_donations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.crm_contacts (id) ON DELETE SET NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  donated_at DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT,
  purpose TEXT,
  finance_income_id UUID,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX crm_donations_club_date_idx ON public.crm_donations (club_id, donated_at DESC);

DO $$
BEGIN
  IF to_regclass('public.finance_income') IS NOT NULL THEN
    ALTER TABLE public.crm_donations
      ADD CONSTRAINT crm_donations_finance_income_fk
      FOREIGN KEY (finance_income_id) REFERENCES public.finance_income (id) ON DELETE SET NULL;

    ALTER TABLE public.finance_income
      ADD COLUMN IF NOT EXISTS crm_donation_id UUID REFERENCES public.crm_donations (id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TRIGGER crm_contacts_set_updated_at
  BEFORE UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER crm_tasks_set_updated_at
  BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER crm_events_set_updated_at
  BEFORE UPDATE ON public.crm_events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER crm_donations_set_updated_at
  BEFORE UPDATE ON public.crm_donations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.crm_contact_id_for_user(p_club_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id
  FROM public.crm_contacts c
  WHERE c.club_id = p_club_id
    AND c.profile_id = p_user_id
    AND c.is_active = TRUE
  LIMIT 1;
$$;

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

CREATE OR REPLACE FUNCTION public.actor_can_read_crm(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_crm_contact(p_club_id UUID, p_contact_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = p_contact_id
      AND c.club_id = p_club_id
      AND (
        public.actor_can_manage_crm(p_club_id)
        OR (
          public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
          AND c.contact_type IN ('parent', 'volunteer')
        )
        OR c.profile_id = auth.uid()
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.actor_crm_portal_contact_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT c.id FROM public.crm_contacts c
  WHERE c.club_id = p_club_id AND c.profile_id = auth.uid();

  IF to_regclass('public.player_guardians') IS NOT NULL THEN
    RETURN QUERY
    SELECT c.id
    FROM public.crm_contacts c
    JOIN public.player_guardians pg ON pg.player_id = c.player_id AND pg.club_id = c.club_id
    WHERE c.club_id = p_club_id
      AND pg.profile_id = auth.uid()
      AND c.contact_type = 'parent';
  END IF;
END;
$$;

ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_donations ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_contacts_select ON public.crm_contacts FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        public.actor_can_read_crm(club_id)
        AND contact_type IN ('parent', 'volunteer')
      )
      OR id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
    )
  );

CREATE POLICY crm_contacts_manage ON public.crm_contacts FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_interactions_select ON public.crm_interactions FOR SELECT TO authenticated
  USING (public.actor_can_access_crm_contact(club_id, contact_id));

CREATE POLICY crm_interactions_manage ON public.crm_interactions FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_tasks_select ON public.crm_tasks FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR notify_user_id = auth.uid()
      OR created_by = auth.uid()
    )
  );

CREATE POLICY crm_tasks_manage ON public.crm_tasks FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_events_select ON public.crm_events FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
        AND event_type IN ('tournament', 'club_picnic', 'parent_meeting', 'other')
      )
      OR EXISTS (
        SELECT 1 FROM public.crm_event_attendees ea
        WHERE ea.event_id = id
          AND (
            ea.profile_id = auth.uid()
            OR ea.contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
          )
      )
    )
  );

CREATE POLICY crm_events_manage ON public.crm_events FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_event_attendees_select ON public.crm_event_attendees FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_crm(club_id)
      OR profile_id = auth.uid()
      OR contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
    )
  );

CREATE POLICY crm_event_attendees_manage ON public.crm_events FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

DROP POLICY IF EXISTS crm_event_attendees_manage ON public.crm_events;

CREATE POLICY crm_event_attendees_manage ON public.crm_event_attendees FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

CREATE POLICY crm_donations_select ON public.crm_donations FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        contact_id IS NOT NULL
        AND contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
      )
    )
  );

CREATE POLICY crm_donations_manage ON public.crm_donations FOR ALL TO authenticated
  USING (public.actor_can_manage_crm(club_id))
  WITH CHECK (public.actor_can_manage_crm(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_contacts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_interactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_event_attendees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_donations TO authenticated;

GRANT EXECUTE ON FUNCTION public.crm_contact_id_for_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_crm(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_crm(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_crm_contact(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_crm_portal_contact_ids(UUID) TO authenticated;
