-- ETAP 7: Moduł finansów klubu

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'treasurer';

CREATE TYPE public.finance_income_category AS ENUM (
  'sponsors',
  'player_fees',
  'grants',
  'donations',
  'club_sales',
  'other'
);

CREATE TYPE public.finance_expense_category AS ENUM (
  'equipment',
  'kits',
  'referees',
  'transport',
  'pitch',
  'training',
  'marketing',
  'administration',
  'other'
);

CREATE TYPE public.finance_fee_plan_type AS ENUM (
  'monthly',
  'one_time'
);

CREATE TYPE public.finance_player_fee_status AS ENUM (
  'paid',
  'partial',
  'overdue'
);

CREATE TYPE public.finance_grant_status AS ENUM (
  'planned',
  'active',
  'completed'
);

CREATE TYPE public.finance_budget_type AS ENUM (
  'season',
  'team',
  'event'
);

CREATE TYPE public.finance_document_type AS ENUM (
  'invoice',
  'receipt',
  'contract'
);

CREATE TYPE public.finance_report_period AS ENUM (
  'monthly',
  'quarterly',
  'yearly'
);

CREATE TYPE public.finance_report_status AS ENUM (
  'draft',
  'published'
);

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'finance';

-- ---------------------------------------------------------------------------
-- Powiązanie rodzic ↔ zawodnik
-- ---------------------------------------------------------------------------

CREATE TABLE public.player_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id, profile_id)
);

CREATE INDEX idx_player_guardians_profile ON public.player_guardians (club_id, profile_id);
CREATE INDEX idx_player_guardians_player ON public.player_guardians (club_id, player_id);

-- ---------------------------------------------------------------------------
-- Przychody i koszty
-- ---------------------------------------------------------------------------

CREATE TABLE public.finance_income (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  description TEXT NOT NULL,
  category public.finance_income_category NOT NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  grant_id UUID,
  player_fee_id UUID,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_income_club_date ON public.finance_income (club_id, transaction_date DESC);
CREATE INDEX idx_finance_income_category ON public.finance_income (club_id, category);

CREATE TABLE public.finance_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  description TEXT NOT NULL,
  category public.finance_expense_category NOT NULL,
  attachment_url TEXT,
  attachment_name TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_expenses_club_date ON public.finance_expenses (club_id, transaction_date DESC);
CREATE INDEX idx_finance_expenses_category ON public.finance_expenses (club_id, category);

-- ---------------------------------------------------------------------------
-- Składki zawodników
-- ---------------------------------------------------------------------------

CREATE TABLE public.finance_fee_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  fee_type public.finance_fee_plan_type NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_fee_plans_club ON public.finance_fee_plans (club_id, is_active);

CREATE TABLE public.finance_player_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  fee_plan_id UUID REFERENCES public.finance_fee_plans (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  due_date DATE NOT NULL,
  amount_due NUMERIC(12, 2) NOT NULL CHECK (amount_due >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  status public.finance_player_fee_status NOT NULL DEFAULT 'overdue',
  period_month DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_player_fees_club_status ON public.finance_player_fees (club_id, status, due_date);
CREATE INDEX idx_finance_player_fees_player ON public.finance_player_fees (player_id, due_date DESC);

CREATE TABLE public.finance_player_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_fee_id UUID NOT NULL REFERENCES public.finance_player_fees (id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_fee_payments_fee ON public.finance_player_fee_payments (player_fee_id, payment_date DESC);

-- ---------------------------------------------------------------------------
-- Dotacje, budżety, dokumenty, raporty
-- ---------------------------------------------------------------------------

CREATE TABLE public.finance_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status public.finance_grant_status NOT NULL DEFAULT 'planned',
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT finance_grants_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_finance_grants_club_status ON public.finance_grants (club_id, status);

ALTER TABLE public.finance_income
  ADD CONSTRAINT finance_income_grant_fk
  FOREIGN KEY (grant_id) REFERENCES public.finance_grants (id) ON DELETE SET NULL;

ALTER TABLE public.finance_income
  ADD CONSTRAINT finance_income_player_fee_fk
  FOREIGN KEY (player_fee_id) REFERENCES public.finance_player_fees (id) ON DELETE SET NULL;

CREATE TABLE public.finance_budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  budget_type public.finance_budget_type NOT NULL,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  season TEXT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  planned_amount NUMERIC(12, 2) NOT NULL CHECK (planned_amount >= 0),
  currency TEXT NOT NULL DEFAULT 'PLN',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT finance_budgets_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_finance_budgets_club ON public.finance_budgets (club_id, period_start DESC);

CREATE TABLE public.finance_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  document_type public.finance_document_type NOT NULL,
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,
  issue_date DATE,
  amount NUMERIC(12, 2),
  income_id UUID REFERENCES public.finance_income (id) ON DELETE SET NULL,
  expense_id UUID REFERENCES public.finance_expenses (id) ON DELETE SET NULL,
  sponsor_id UUID REFERENCES public.sponsors (id) ON DELETE SET NULL,
  grant_id UUID REFERENCES public.finance_grants (id) ON DELETE SET NULL,
  uploaded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_finance_documents_club ON public.finance_documents (club_id, issue_date DESC);

CREATE TABLE public.finance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  period_type public.finance_report_period NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.finance_report_status NOT NULL DEFAULT 'draft',
  generated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT finance_reports_period_check CHECK (period_end >= period_start)
);

CREATE INDEX idx_finance_reports_club ON public.finance_reports (club_id, period_end DESC);

INSERT INTO public.ai_report_categories (id, label, sort_order)
VALUES ('finance', 'Finanse klubu', 60)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, sort_order = EXCLUDED.sort_order;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

CREATE TRIGGER finance_income_set_updated_at
  BEFORE UPDATE ON public.finance_income
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_expenses_set_updated_at
  BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_fee_plans_set_updated_at
  BEFORE UPDATE ON public.finance_fee_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_player_fees_set_updated_at
  BEFORE UPDATE ON public.finance_player_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_grants_set_updated_at
  BEFORE UPDATE ON public.finance_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_budgets_set_updated_at
  BEFORE UPDATE ON public.finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER finance_reports_set_updated_at
  BEFORE UPDATE ON public.finance_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.refresh_finance_player_fee_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partial';
  ELSE
    NEW.status := 'overdue';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_player_fees_refresh_status
  BEFORE INSERT OR UPDATE OF amount_due, amount_paid, due_date ON public.finance_player_fees
  FOR EACH ROW EXECUTE FUNCTION public.refresh_finance_player_fee_status();

CREATE OR REPLACE FUNCTION public.enforce_finance_player_fee_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_player_fees_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.finance_player_fees
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_player_fee_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_fee_payment_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_fee RECORD;
BEGIN
  SELECT club_id, amount_due, amount_paid INTO v_fee
  FROM public.finance_player_fees WHERE id = NEW.player_fee_id;
  IF v_fee.club_id IS NULL OR v_fee.club_id IS DISTINCT FROM NEW.club_id THEN
    RAISE EXCEPTION 'player_fee_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_fee_payments_enforce_club
  BEFORE INSERT OR UPDATE OF player_fee_id, club_id ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_payment_club_consistency();

CREATE OR REPLACE FUNCTION public.apply_finance_fee_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.finance_player_fees
  SET amount_paid = amount_paid + NEW.amount
  WHERE id = NEW.player_fee_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_fee_payments_apply
  AFTER INSERT ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.apply_finance_fee_payment();

CREATE OR REPLACE FUNCTION public.enforce_player_guardian_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER player_guardians_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_guardians
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_guardian_club_consistency();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.parent_player_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pg.player_id
  FROM public.player_guardians pg
  WHERE pg.club_id = p_club_id
    AND pg.profile_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_finance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','treasurer']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_finance(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','treasurer','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_finance_portal(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.user_has_club_role(p_club_id, ARRAY['parent']::public.club_role[])
      AND EXISTS (
        SELECT 1 FROM public.player_guardians pg
        WHERE pg.club_id = p_club_id AND pg.profile_id = auth.uid()
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_ai_report(
  p_club_id UUID,
  p_category public.ai_report_category
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      (
        p_category IN ('management', 'sponsors', 'finance')
        AND public.user_has_club_role(
          p_club_id,
          ARRAY['owner','president','treasurer','sports_director']::public.club_role[]
        )
      )
      OR (
        p_category IN ('matches', 'trainings', 'players')
        AND public.user_has_club_role(
          p_club_id,
          ARRAY['owner','president','sports_director','coach']::public.club_role[]
        )
      )
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.player_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_income ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_fee_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_player_fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_player_fee_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "player_guardians_select"
  ON public.player_guardians FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR profile_id = auth.uid()
  );

CREATE POLICY "player_guardians_manage"
  ON public.player_guardians FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_income_select"
  ON public.finance_income FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_income_manage"
  ON public.finance_income FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_expenses_select"
  ON public.finance_expenses FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_expenses_manage"
  ON public.finance_expenses FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_fee_plans_select"
  ON public.finance_fee_plans FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_fee_plans_manage"
  ON public.finance_fee_plans FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_player_fees_select"
  ON public.finance_player_fees FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR player_id IN (SELECT public.parent_player_ids(club_id))
  );

CREATE POLICY "finance_player_fees_manage"
  ON public.finance_player_fees FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_fee_payments_select"
  ON public.finance_player_fee_payments FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR EXISTS (
      SELECT 1 FROM public.finance_player_fees f
      WHERE f.id = player_fee_id
        AND f.player_id IN (SELECT public.parent_player_ids(club_id))
    )
  );

CREATE POLICY "finance_fee_payments_manage"
  ON public.finance_player_fee_payments FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_grants_select"
  ON public.finance_grants FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_grants_manage"
  ON public.finance_grants FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_budgets_select"
  ON public.finance_budgets FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_budgets_manage"
  ON public.finance_budgets FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_documents_select"
  ON public.finance_documents FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_documents_manage"
  ON public.finance_documents FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

CREATE POLICY "finance_reports_select"
  ON public.finance_reports FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

CREATE POLICY "finance_reports_manage"
  ON public.finance_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

-- Storage: finance documents
CREATE POLICY "club_assets_finance_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_finance(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_finance_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_finance_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  )
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_finance_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_guardians TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_income TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_expenses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_fee_plans TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_player_fees TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_player_fee_payments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_grants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.finance_reports TO authenticated;

GRANT EXECUTE ON FUNCTION public.parent_player_ids(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_finance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_finance(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_finance_portal(UUID) TO authenticated;
