-- ETAP 6: Moduł sponsorów i partnerów klubu

CREATE TYPE public.sponsor_cooperation_status AS ENUM (
  'active',
  'expiring',
  'ended',
  'potential'
);

CREATE TYPE public.sponsor_contract_status AS ENUM (
  'active',
  'expiring',
  'expired'
);

CREATE TYPE public.sponsor_lead_status AS ENUM (
  'new',
  'in_discussion',
  'offer_sent',
  'negotiation',
  'won',
  'rejected'
);

CREATE TYPE public.sponsor_note_type AS ENUM (
  'phone',
  'meeting',
  'email',
  'note'
);

CREATE TYPE public.sponsor_publication_source AS ENUM (
  'facebook',
  'instagram',
  'website',
  'other'
);

CREATE TYPE public.sponsor_exposure_type AS ENUM (
  'publication',
  'sponsored_match',
  'sponsored_event'
);

CREATE TYPE public.sponsor_financial_entry_type AS ENUM (
  'payment',
  'installment',
  'invoice'
);

CREATE TYPE public.sponsor_financial_status AS ENUM (
  'planned',
  'pending',
  'paid',
  'overdue',
  'cancelled'
);

CREATE TYPE public.sponsor_report_status AS ENUM (
  'draft',
  'published'
);

-- ---------------------------------------------------------------------------
-- Sponsors CRM
-- ---------------------------------------------------------------------------

CREATE TABLE public.sponsors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  company_name TEXT NOT NULL,
  logo_url TEXT,
  nip TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  website TEXT,
  phone TEXT,
  email TEXT,
  contact_first_name TEXT,
  contact_last_name TEXT,
  contact_position TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  cooperation_status public.sponsor_cooperation_status NOT NULL DEFAULT 'potential',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsors_club ON public.sponsors (club_id, cooperation_status);
CREATE INDEX idx_sponsors_profile ON public.sponsors (profile_id) WHERE profile_id IS NOT NULL;

CREATE TABLE public.sponsor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'PLN',
  benefits_description TEXT,
  status public.sponsor_contract_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT sponsor_contracts_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX idx_sponsor_contracts_club ON public.sponsor_contracts (club_id, status, end_date);
CREATE INDEX idx_sponsor_contracts_sponsor ON public.sponsor_contracts (sponsor_id, end_date DESC);

CREATE TABLE public.sponsor_contract_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  contract_id UUID NOT NULL REFERENCES public.sponsor_contracts (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_contract_attachments_contract
  ON public.sponsor_contract_attachments (contract_id);

CREATE TABLE public.sponsor_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  status public.sponsor_lead_status NOT NULL DEFAULT 'new',
  notes TEXT,
  assigned_to UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  converted_sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_leads_club ON public.sponsor_leads (club_id, status);

CREATE TABLE public.sponsor_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  note_type public.sponsor_note_type NOT NULL DEFAULT 'note',
  content TEXT NOT NULL,
  contact_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_notes_sponsor ON public.sponsor_notes (sponsor_id, contact_date DESC);

CREATE TABLE public.sponsor_publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  published_at DATE NOT NULL,
  description TEXT,
  image_url TEXT,
  source public.sponsor_publication_source NOT NULL DEFAULT 'other',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_publications_club ON public.sponsor_publications (club_id, published_at DESC);

CREATE TABLE public.sponsor_publication_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  publication_id UUID NOT NULL REFERENCES public.sponsor_publications (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (publication_id, sponsor_id)
);

CREATE TABLE public.sponsor_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  exposure_type public.sponsor_exposure_type NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  exposure_date DATE NOT NULL,
  publication_id UUID REFERENCES public.sponsor_publications (id) ON DELETE SET NULL,
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_exposure_sponsor ON public.sponsor_exposure (sponsor_id, exposure_date DESC);

CREATE TABLE public.sponsor_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.sponsor_report_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT sponsor_reports_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_sponsor_reports_sponsor ON public.sponsor_reports (sponsor_id, period_end DESC);

-- Architektura pod finanse (bez pełnej księgowości)
CREATE TABLE public.sponsor_financial_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sponsor_id UUID NOT NULL REFERENCES public.sponsors (id) ON DELETE CASCADE,
  contract_id UUID REFERENCES public.sponsor_contracts (id) ON DELETE SET NULL,
  entry_type public.sponsor_financial_entry_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PLN',
  due_date DATE,
  paid_at DATE,
  status public.sponsor_financial_status NOT NULL DEFAULT 'planned',
  reference_number TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_sponsor_financial_sponsor ON public.sponsor_financial_entries (sponsor_id, due_date);

-- Rozszerzenie powiadomień o umowy sponsorskie
ALTER TABLE public.club_notifications
  ADD COLUMN IF NOT EXISTS sponsor_contract_id UUID REFERENCES public.sponsor_contracts (id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS sponsor_reminder_days INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_club_notifications_sponsor_dedup
  ON public.club_notifications (user_id, sponsor_contract_id, sponsor_reminder_days)
  WHERE sponsor_contract_id IS NOT NULL AND sponsor_reminder_days IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER sponsors_set_updated_at
  BEFORE UPDATE ON public.sponsors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_contracts_set_updated_at
  BEFORE UPDATE ON public.sponsor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_leads_set_updated_at
  BEFORE UPDATE ON public.sponsor_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_notes_set_updated_at
  BEFORE UPDATE ON public.sponsor_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_publications_set_updated_at
  BEFORE UPDATE ON public.sponsor_publications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_reports_set_updated_at
  BEFORE UPDATE ON public.sponsor_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER sponsor_financial_entries_set_updated_at
  BEFORE UPDATE ON public.sponsor_financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_contract_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sponsor_contracts_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_contract_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_child_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_sponsor_club UUID;
BEGIN
  SELECT club_id INTO v_sponsor_club FROM public.sponsors WHERE id = NEW.sponsor_id;
  IF v_sponsor_club IS NULL OR v_sponsor_club IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sponsor_notes_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_notes
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_child_club_consistency();

CREATE TRIGGER sponsor_exposure_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_exposure
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_child_club_consistency();

CREATE TRIGGER sponsor_reports_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, club_id ON public.sponsor_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_child_club_consistency();

CREATE OR REPLACE FUNCTION public.refresh_sponsor_contract_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_days INTEGER;
  v_status public.sponsor_contract_status;
BEGIN
  v_days := NEW.end_date - CURRENT_DATE;
  IF v_days < 0 THEN
    v_status := 'expired';
  ELSIF v_days <= 60 THEN
    v_status := 'expiring';
  ELSE
    v_status := 'active';
  END IF;
  NEW.status := v_status;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sponsor_contracts_refresh_status
  BEFORE INSERT OR UPDATE OF end_date ON public.sponsor_contracts
  FOR EACH ROW EXECUTE FUNCTION public.refresh_sponsor_contract_status();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sponsor_id_for_user(p_club_id UUID, p_user_id UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id
  FROM public.sponsors s
  WHERE s.club_id = p_club_id
    AND s.profile_id = p_user_id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_sponsors(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_sponsors(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_sponsor_contracts(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_is_sponsor_user(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(p_club_id, ARRAY['sponsor']::public.club_role[])
    AND public.sponsor_id_for_user(p_club_id, auth.uid()) IS NOT NULL;
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_sponsor_row(p_club_id UUID, p_sponsor_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    public.actor_can_read_sponsors(p_club_id)
    OR (
      public.actor_is_sponsor_user(p_club_id)
      AND p_sponsor_id = public.sponsor_id_for_user(p_club_id, auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_contract_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_publication_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_exposure ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsor_financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sponsors_select" ON public.sponsors FOR SELECT TO authenticated
  USING (public.actor_can_access_sponsor_row(club_id, id));

CREATE POLICY "sponsors_manage" ON public.sponsors FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_contracts_select" ON public.sponsor_contracts FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsor_contracts(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
    )
  );

CREATE POLICY "sponsor_contracts_manage" ON public.sponsor_contracts FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_contract_attachments_select" ON public.sponsor_contract_attachments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.sponsor_contracts c
      WHERE c.id = contract_id
        AND (
          public.actor_can_read_sponsor_contracts(c.club_id)
          OR (
            public.actor_is_sponsor_user(c.club_id)
            AND c.sponsor_id = public.sponsor_id_for_user(c.club_id, auth.uid())
          )
        )
    )
  );

CREATE POLICY "sponsor_contract_attachments_manage" ON public.sponsor_contract_attachments FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_leads_select" ON public.sponsor_leads FOR SELECT TO authenticated
  USING (public.actor_can_read_sponsors(club_id));

CREATE POLICY "sponsor_leads_manage" ON public.sponsor_leads FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_notes_select" ON public.sponsor_notes FOR SELECT TO authenticated
  USING (public.actor_can_read_sponsors(club_id));

CREATE POLICY "sponsor_notes_manage" ON public.sponsor_notes FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_publications_select" ON public.sponsor_publications FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR public.actor_is_sponsor_user(club_id)
  );

CREATE POLICY "sponsor_publications_manage" ON public.sponsor_publications FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_publication_links_select" ON public.sponsor_publication_links FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
    )
  );

CREATE POLICY "sponsor_publication_links_manage" ON public.sponsor_publication_links FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_exposure_select" ON public.sponsor_exposure FOR SELECT TO authenticated
  USING (public.actor_can_access_sponsor_row(club_id, sponsor_id));

CREATE POLICY "sponsor_exposure_manage" ON public.sponsor_exposure FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_reports_select" ON public.sponsor_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
    )
  );

CREATE POLICY "sponsor_reports_manage" ON public.sponsor_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

CREATE POLICY "sponsor_financial_select" ON public.sponsor_financial_entries FOR SELECT TO authenticated
  USING (public.actor_can_read_sponsor_contracts(club_id));

CREATE POLICY "sponsor_financial_manage" ON public.sponsor_financial_entries FOR ALL TO authenticated
  USING (public.actor_can_manage_sponsors(club_id))
  WITH CHECK (public.actor_can_manage_sponsors(club_id));

-- Powiadomienia sponsorskie — insert dla zarządu
DROP POLICY IF EXISTS "club_notifications_insert_staff" ON public.club_notifications;
CREATE POLICY "club_notifications_insert_staff" ON public.club_notifications FOR INSERT TO authenticated
  WITH CHECK (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_trainings(club_id)
      OR public.actor_can_manage_sponsors(club_id)
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_contracts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_contract_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_leads TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_publications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_publication_links TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_exposure TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsor_financial_entries TO authenticated;

GRANT EXECUTE ON FUNCTION public.sponsor_id_for_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_sponsors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_sponsors(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_sponsor_contracts(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_is_sponsor_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_sponsor_row(UUID, UUID) TO authenticated;
