-- FC OS Production Parity Patch
-- Sprint 17.4 — forward-only schema alignment (DESIGN ARTIFACT)
-- Generated: 2026-06-03
--
-- Brings production from 104 → 148 tables (adds Finance, Inventory, Academy, Integrations)
-- Also adds missing audit functions on Content Hub and Matches modules.
--
-- Contains ONLY: tables, enums, indexes, constraints, RLS, functions, triggers
-- Excludes: INSERT, UPDATE, DELETE, club seeds, Piorun data
--
-- ⚠️  DO NOT apply to production without:
--     1. Supabase PITR backup verified
--     2. Staging validation (see docs/architecture/sprint-174-staging-plan.md)
--     3. Maintenance window approval
--
-- Apply order (staging first):
--   baseline.sql (new projects only)
--   prod-parity-patch.sql (existing prod / staging clone)

BEGIN;

-- =============================================================================
-- MODULE PATCHES (44 missing tables)
-- =============================================================================


-- --- Source: 20260601100000_finance_module.sql ---

-- ETAP 7: Moduł finansów klubu

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'treasurer';

DO $$ BEGIN
  CREATE TYPE public.finance_income_category AS ENUM (
  'sponsors',
  'player_fees',
  'grants',
  'donations',
  'club_sales',
  'other'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
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
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_fee_plan_type AS ENUM (
  'monthly',
  'one_time'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_player_fee_status AS ENUM (
  'paid',
  'partial',
  'overdue'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_grant_status AS ENUM (
  'planned',
  'active',
  'completed'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_budget_type AS ENUM (
  'season',
  'team',
  'event'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_document_type AS ENUM (
  'invoice',
  'receipt',
  'contract'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_report_period AS ENUM (
  'monthly',
  'quarterly',
  'yearly'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.finance_report_status AS ENUM (
  'draft',
  'published'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'finance';

-- ---------------------------------------------------------------------------
-- Powiązanie rodzic ↔ zawodnik
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  relationship TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id, profile_id)
);

CREATE INDEX IF NOT EXISTS idx_player_guardians_profile ON public.player_guardians (club_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_player_guardians_player ON public.player_guardians (club_id, player_id);

-- ---------------------------------------------------------------------------
-- Przychody i koszty
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_income (
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

CREATE INDEX IF NOT EXISTS idx_finance_income_club_date ON public.finance_income (club_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_income_category ON public.finance_income (club_id, category);

CREATE TABLE IF NOT EXISTS public.finance_expenses (
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

CREATE INDEX IF NOT EXISTS idx_finance_expenses_club_date ON public.finance_expenses (club_id, transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_finance_expenses_category ON public.finance_expenses (club_id, category);

-- ---------------------------------------------------------------------------
-- Składki zawodników
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_fee_plans (
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

CREATE INDEX IF NOT EXISTS idx_finance_fee_plans_club ON public.finance_fee_plans (club_id, is_active);

CREATE TABLE IF NOT EXISTS public.finance_player_fees (
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

CREATE INDEX IF NOT EXISTS idx_finance_player_fees_club_status ON public.finance_player_fees (club_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_finance_player_fees_player ON public.finance_player_fees (player_id, due_date DESC);

CREATE TABLE IF NOT EXISTS public.finance_player_fee_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_fee_id UUID NOT NULL REFERENCES public.finance_player_fees (id) ON DELETE CASCADE,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  note TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_finance_fee_payments_fee ON public.finance_player_fee_payments (player_fee_id, payment_date DESC);

-- ---------------------------------------------------------------------------
-- Dotacje, budżety, dokumenty, raporty
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.finance_grants (
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

CREATE INDEX IF NOT EXISTS idx_finance_grants_club_status ON public.finance_grants (club_id, status);

DO $$ BEGIN
  ALTER TABLE public.finance_income ADD CONSTRAINT finance_income_grant_fk FOREIGN KEY (grant_id) REFERENCES public.finance_grants (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.finance_income ADD CONSTRAINT finance_income_player_fee_fk FOREIGN KEY (player_fee_id) REFERENCES public.finance_player_fees (id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.finance_budgets (
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

CREATE INDEX IF NOT EXISTS idx_finance_budgets_club ON public.finance_budgets (club_id, period_start DESC);

CREATE TABLE IF NOT EXISTS public.finance_documents (
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

CREATE INDEX IF NOT EXISTS idx_finance_documents_club ON public.finance_documents (club_id, issue_date DESC);

CREATE TABLE IF NOT EXISTS public.finance_reports (
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

CREATE INDEX IF NOT EXISTS idx_finance_reports_club ON public.finance_reports (club_id, period_end DESC);

-- [stripped: INSERT]

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS finance_income_set_updated_at ON public.finance_income;
CREATE TRIGGER finance_income_set_updated_at BEFORE UPDATE ON public.finance_income
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS finance_expenses_set_updated_at ON public.finance_expenses;
CREATE TRIGGER finance_expenses_set_updated_at BEFORE UPDATE ON public.finance_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS finance_fee_plans_set_updated_at ON public.finance_fee_plans;
CREATE TRIGGER finance_fee_plans_set_updated_at BEFORE UPDATE ON public.finance_fee_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS finance_player_fees_set_updated_at ON public.finance_player_fees;
CREATE TRIGGER finance_player_fees_set_updated_at BEFORE UPDATE ON public.finance_player_fees
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS finance_grants_set_updated_at ON public.finance_grants;
CREATE TRIGGER finance_grants_set_updated_at BEFORE UPDATE ON public.finance_grants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS finance_budgets_set_updated_at ON public.finance_budgets;
CREATE TRIGGER finance_budgets_set_updated_at BEFORE UPDATE ON public.finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS finance_reports_set_updated_at ON public.finance_reports;
CREATE TRIGGER finance_reports_set_updated_at BEFORE UPDATE ON public.finance_reports
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

DROP TRIGGER IF EXISTS finance_player_fees_refresh_status ON public.finance_player_fees;
CREATE TRIGGER finance_player_fees_refresh_status BEFORE INSERT OR UPDATE OF amount_due, amount_paid, due_date ON public.finance_player_fees
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

DROP TRIGGER IF EXISTS finance_player_fees_enforce_club ON public.finance_player_fees;
CREATE TRIGGER finance_player_fees_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.finance_player_fees
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

DROP TRIGGER IF EXISTS finance_fee_payments_enforce_club ON public.finance_player_fee_payments;
CREATE TRIGGER finance_fee_payments_enforce_club BEFORE INSERT OR UPDATE OF player_fee_id, club_id ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_payment_club_consistency();

CREATE OR REPLACE FUNCTION public.apply_finance_fee_payment()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
-- [stripped: UPDATE]
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_fee_payments_apply ON public.finance_player_fee_payments;
CREATE TRIGGER finance_fee_payments_apply AFTER INSERT ON public.finance_player_fee_payments
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

DROP TRIGGER IF EXISTS player_guardians_enforce_club ON public.player_guardians;
CREATE TRIGGER player_guardians_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_guardians
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

DROP POLICY IF EXISTS player_guardians_select ON public.player_guardians;
CREATE POLICY player_guardians_select ON public.player_guardians FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR profile_id = auth.uid()
  );

DROP POLICY IF EXISTS player_guardians_manage ON public.player_guardians;
CREATE POLICY player_guardians_manage ON public.player_guardians FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_income_select ON public.finance_income;
CREATE POLICY finance_income_select ON public.finance_income FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

DROP POLICY IF EXISTS finance_income_manage ON public.finance_income;
CREATE POLICY finance_income_manage ON public.finance_income FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_expenses_select ON public.finance_expenses;
CREATE POLICY finance_expenses_select ON public.finance_expenses FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

DROP POLICY IF EXISTS finance_expenses_manage ON public.finance_expenses;
CREATE POLICY finance_expenses_manage ON public.finance_expenses FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_fee_plans_select ON public.finance_fee_plans;
CREATE POLICY finance_fee_plans_select ON public.finance_fee_plans FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

DROP POLICY IF EXISTS finance_fee_plans_manage ON public.finance_fee_plans;
CREATE POLICY finance_fee_plans_manage ON public.finance_fee_plans FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_player_fees_select ON public.finance_player_fees;
CREATE POLICY finance_player_fees_select ON public.finance_player_fees FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR player_id IN (SELECT public.parent_player_ids(club_id))
  );

DROP POLICY IF EXISTS finance_player_fees_manage ON public.finance_player_fees;
CREATE POLICY finance_player_fees_manage ON public.finance_player_fees FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_fee_payments_select ON public.finance_player_fee_payments;
CREATE POLICY finance_fee_payments_select ON public.finance_player_fee_payments FOR SELECT TO authenticated
  USING (
    public.actor_can_read_finance(club_id)
    OR EXISTS (
      SELECT 1 FROM public.finance_player_fees f
      WHERE f.id = player_fee_id
        AND f.player_id IN (SELECT public.parent_player_ids(club_id))
    )
  );

DROP POLICY IF EXISTS finance_fee_payments_manage ON public.finance_player_fee_payments;
CREATE POLICY finance_fee_payments_manage ON public.finance_player_fee_payments FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_grants_select ON public.finance_grants;
CREATE POLICY finance_grants_select ON public.finance_grants FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

DROP POLICY IF EXISTS finance_grants_manage ON public.finance_grants;
CREATE POLICY finance_grants_manage ON public.finance_grants FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_budgets_select ON public.finance_budgets;
CREATE POLICY finance_budgets_select ON public.finance_budgets FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

DROP POLICY IF EXISTS finance_budgets_manage ON public.finance_budgets;
CREATE POLICY finance_budgets_manage ON public.finance_budgets FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_documents_select ON public.finance_documents;
CREATE POLICY finance_documents_select ON public.finance_documents FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

DROP POLICY IF EXISTS finance_documents_manage ON public.finance_documents;
CREATE POLICY finance_documents_manage ON public.finance_documents FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

DROP POLICY IF EXISTS finance_reports_select ON public.finance_reports;
CREATE POLICY finance_reports_select ON public.finance_reports FOR SELECT TO authenticated
  USING (public.actor_can_read_finance(club_id));

DROP POLICY IF EXISTS finance_reports_manage ON public.finance_reports;
CREATE POLICY finance_reports_manage ON public.finance_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_finance(club_id))
  WITH CHECK (public.actor_can_manage_finance(club_id));

-- Storage: finance documents
DROP POLICY IF EXISTS club_assets_finance_select ON storage.objects;
CREATE POLICY club_assets_finance_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_finance(public.storage_club_id_from_path(name))
  );

DROP POLICY IF EXISTS club_assets_finance_insert ON storage.objects;
CREATE POLICY club_assets_finance_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'finance'
    AND public.actor_can_manage_finance(public.storage_club_id_from_path(name))
  );

DROP POLICY IF EXISTS club_assets_finance_update ON storage.objects;
CREATE POLICY club_assets_finance_update ON storage.objects FOR UPDATE TO authenticated
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

DROP POLICY IF EXISTS club_assets_finance_delete ON storage.objects;
CREATE POLICY club_assets_finance_delete ON storage.objects FOR DELETE TO authenticated
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


-- --- Source: 20260601102000_finance_audit_hardening.sql ---

-- ETAP 7 audit: RLS, triggery spójności, limity wpłat, wydajność

-- Poprawny status składki (zaległa tylko po terminie)
CREATE OR REPLACE FUNCTION public.refresh_finance_player_fee_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.amount_paid >= NEW.amount_due THEN
    NEW.status := 'paid';
  ELSIF NEW.amount_paid > 0 THEN
    NEW.status := 'partial';
  ELSIF NEW.due_date < CURRENT_DATE THEN
    NEW.status := 'overdue';
  ELSE
    NEW.status := 'partial';
  END IF;
  RETURN NEW;
END;
$$;

-- Blokada nadpłaty składki
CREATE OR REPLACE FUNCTION public.enforce_finance_fee_payment_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_amount_due NUMERIC(12, 2);
  v_amount_paid NUMERIC(12, 2);
BEGIN
  SELECT amount_due, amount_paid INTO v_amount_due, v_amount_paid
  FROM public.finance_player_fees
  WHERE id = NEW.player_fee_id;

  IF v_amount_due IS NULL THEN
    RAISE EXCEPTION 'player_fee_id not found';
  END IF;

  IF (v_amount_paid + NEW.amount) > v_amount_due THEN
    RAISE EXCEPTION 'payment exceeds remaining fee amount';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_fee_payments_cap ON public.finance_player_fee_payments;
DROP TRIGGER IF EXISTS finance_fee_payments_cap ON public.finance_player_fee_payments;
CREATE TRIGGER finance_fee_payments_cap BEFORE INSERT ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_payment_cap();

ALTER TABLE public.finance_player_fees
  DROP CONSTRAINT IF EXISTS finance_player_fees_paid_lte_due_check;

DO $$ BEGIN
  ALTER TABLE public.finance_player_fees ADD CONSTRAINT finance_player_fees_paid_lte_due_check CHECK (amount_paid <= amount_due);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Spójność club_id na powiązanych rekordach
CREATE OR REPLACE FUNCTION public.enforce_finance_income_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.sponsor_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sponsors s WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  IF NEW.grant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_grants g WHERE g.id = NEW.grant_id AND g.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'grant_id does not belong to club_id';
  END IF;
  IF NEW.player_fee_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_player_fees f WHERE f.id = NEW.player_fee_id AND f.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_fee_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_income_enforce_club ON public.finance_income;
DROP TRIGGER IF EXISTS finance_income_enforce_club ON public.finance_income;
CREATE TRIGGER finance_income_enforce_club BEFORE INSERT OR UPDATE OF sponsor_id, grant_id, player_fee_id, club_id ON public.finance_income
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_income_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_document_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.income_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_income i WHERE i.id = NEW.income_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'income_id does not belong to club_id';
  END IF;
  IF NEW.expense_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_expenses e WHERE e.id = NEW.expense_id AND e.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'expense_id does not belong to club_id';
  END IF;
  IF NEW.grant_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.finance_grants g WHERE g.id = NEW.grant_id AND g.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'grant_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_documents_enforce_club ON public.finance_documents;
DROP TRIGGER IF EXISTS finance_documents_enforce_club ON public.finance_documents;
CREATE TRIGGER finance_documents_enforce_club BEFORE INSERT OR UPDATE OF income_id, expense_id, grant_id, club_id ON public.finance_documents
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_document_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_fee_plan_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_fee_plans_enforce_club ON public.finance_fee_plans;
DROP TRIGGER IF EXISTS finance_fee_plans_enforce_club ON public.finance_fee_plans;
CREATE TRIGGER finance_fee_plans_enforce_club BEFORE INSERT OR UPDATE OF team_id, club_id ON public.finance_fee_plans
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_plan_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_finance_budget_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS finance_budgets_enforce_club ON public.finance_budgets;
DROP TRIGGER IF EXISTS finance_budgets_enforce_club ON public.finance_budgets;
CREATE TRIGGER finance_budgets_enforce_club BEFORE INSERT OR UPDATE OF team_id, club_id ON public.finance_budgets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_budget_club_consistency();

-- Defense-in-depth na helperach RLS
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

CREATE OR REPLACE FUNCTION public.parent_player_ids(p_club_id UUID)
RETURNS SETOF UUID
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT pg.player_id
  FROM public.player_guardians pg
  WHERE pg.club_id = p_club_id
    AND pg.profile_id = auth.uid()
    AND p_club_id IN (SELECT public.user_club_ids());
$$;

-- Raporty: dyrektor sportowy widzi tylko opublikowane
DROP POLICY IF EXISTS "finance_reports_select" ON public.finance_reports;
DROP POLICY IF EXISTS finance_reports_select ON public.finance_reports;
CREATE POLICY finance_reports_select ON public.finance_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_finance(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['owner','president','treasurer']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
    )
    OR (
      public.user_has_club_role(club_id, ARRAY['sports_director']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );

-- Indeksy wydajnościowe
CREATE INDEX IF NOT EXISTS idx_finance_fee_payments_club
  ON public.finance_player_fee_payments (club_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_finance_player_fees_overdue
  ON public.finance_player_fees (club_id, due_date)
  WHERE status IN ('partial', 'overdue') AND amount_paid < amount_due;

-- Agregaty dashboardu (bez ładowania 5000 wierszy)
CREATE OR REPLACE FUNCTION public.get_finance_dashboard_totals(p_club_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_income', COALESCE((
      SELECT SUM(amount) FROM public.finance_income WHERE club_id = p_club_id
    ), 0),
    'total_expenses', COALESCE((
      SELECT SUM(amount) FROM public.finance_expenses WHERE club_id = p_club_id
    ), 0),
    'sponsor_income', COALESCE((
      SELECT SUM(amount) FROM public.finance_income
      WHERE club_id = p_club_id AND category = 'sponsors'
    ), 0),
    'total_fees_due', COALESCE((
      SELECT SUM(amount_due) FROM public.finance_player_fees WHERE club_id = p_club_id
    ), 0),
    'total_fees_paid', COALESCE((
      SELECT SUM(amount_paid) FROM public.finance_player_fees WHERE club_id = p_club_id
    ), 0),
    'overdue_fees_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.finance_player_fees
      WHERE club_id = p_club_id
        AND amount_paid < amount_due
        AND due_date < CURRENT_DATE
    ), 0)
  )
  WHERE public.actor_can_read_finance(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_dashboard_totals(UUID) TO authenticated;

-- Odśwież status istniejących składek
-- [stripped: UPDATE]


-- --- Source: 20260602100000_inventory_module.sql ---

-- ETAP 8: Moduł magazynowy klubu

DO $$ BEGIN
  CREATE TYPE public.inventory_item_category AS ENUM (
  'match_kit',
  'training_kit',
  'tracksuit',
  'balls',
  'markers',
  'cones',
  'training_goals',
  'medical',
  'strength',
  'pitch',
  'electronics',
  'other'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_item_status AS ENUM (
  'available',
  'issued',
  'damaged',
  'retired'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_recipient_type AS ENUM (
  'player',
  'coach',
  'team_manager'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_return_condition AS ENUM (
  'functional',
  'damaged',
  'lost'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_damage_status AS ENUM (
  'reported',
  'in_repair',
  'repaired',
  'replacement_needed'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_order_status AS ENUM (
  'draft',
  'ordered',
  'in_progress',
  'delivered',
  'cancelled'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_stocktake_type AS ENUM (
  'partial',
  'full'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_stocktake_status AS ENUM (
  'in_progress',
  'completed'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_report_type AS ENUM (
  'stock_status',
  'issued_equipment',
  'damaged_equipment',
  'issue_history'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.inventory_report_status AS ENUM (
  'draft',
  'published'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'inventory';

-- ---------------------------------------------------------------------------
-- Kategorie (słownik per klub)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug public.inventory_item_category NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_inventory_categories_club ON public.inventory_categories (club_id, sort_order);

-- ---------------------------------------------------------------------------
-- Dostawcy
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_suppliers_club ON public.inventory_suppliers (club_id, name);

-- ---------------------------------------------------------------------------
-- Kartoteka sprzętu
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.inventory_categories (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  inventory_number TEXT NOT NULL,
  internal_code TEXT,
  photo_path TEXT,
  description TEXT,
  purchase_date DATE,
  purchase_price NUMERIC(12, 2) CHECK (purchase_price IS NULL OR purchase_price >= 0),
  supplier_id UUID REFERENCES public.inventory_suppliers (id) ON DELETE SET NULL,
  status public.inventory_item_status NOT NULL DEFAULT 'available',
  quantity_total INTEGER NOT NULL DEFAULT 0 CHECK (quantity_total >= 0),
  quantity_available INTEGER NOT NULL DEFAULT 0 CHECK (quantity_available >= 0),
  quantity_issued INTEGER NOT NULL DEFAULT 0 CHECK (quantity_issued >= 0),
  quantity_damaged INTEGER NOT NULL DEFAULT 0 CHECK (quantity_damaged >= 0),
  min_stock_level INTEGER NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_items_quantities_check CHECK (
    quantity_total = quantity_available + quantity_issued + quantity_damaged
  ),
  UNIQUE (club_id, inventory_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_club_category ON public.inventory_items (club_id, category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_club_status ON public.inventory_items (club_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_items_low_stock ON public.inventory_items (club_id)
  WHERE quantity_available <= min_stock_level AND min_stock_level > 0;

-- ---------------------------------------------------------------------------
-- Wydania sprzętu
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  recipient_type public.inventory_recipient_type NOT NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_return_date DATE,
  notes TEXT,
  issued_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT inventory_transactions_recipient_check CHECK (
    (recipient_type = 'player' AND player_id IS NOT NULL)
    OR (recipient_type IN ('coach', 'team_manager') AND profile_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_club_date ON public.inventory_transactions (club_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_item ON public.inventory_transactions (item_id, issue_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_player ON public.inventory_transactions (club_id, player_id);

-- ---------------------------------------------------------------------------
-- Zwroty
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_returns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES public.inventory_transactions (id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  return_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  condition public.inventory_return_condition NOT NULL DEFAULT 'functional',
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_returns_club_date ON public.inventory_returns (club_id, return_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_returns_item ON public.inventory_returns (item_id);

-- ---------------------------------------------------------------------------
-- Uszkodzenia
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_damages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  photo_path TEXT,
  damage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.inventory_damage_status NOT NULL DEFAULT 'reported',
  reported_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_damages_club_status ON public.inventory_damages (club_id, status);

-- ---------------------------------------------------------------------------
-- Stroje zawodników
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_player_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  jersey_number INTEGER CHECK (jersey_number IS NULL OR jersey_number > 0),
  jersey_size TEXT,
  shorts_size TEXT,
  tracksuit_size TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id)
);

CREATE TABLE IF NOT EXISTS public.inventory_kit_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.inventory_transactions (id) ON DELETE SET NULL,
  kit_name TEXT NOT NULL,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  returned_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_kit_assignments_player ON public.inventory_kit_assignments (club_id, player_id, assigned_date DESC);

-- ---------------------------------------------------------------------------
-- Inwentaryzacja
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_stocktakes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  stocktake_type public.inventory_stocktake_type NOT NULL,
  status public.inventory_stocktake_status NOT NULL DEFAULT 'in_progress',
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  conducted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE TABLE IF NOT EXISTS public.inventory_stocktake_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  stocktake_id UUID NOT NULL REFERENCES public.inventory_stocktakes (id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items (id) ON DELETE CASCADE,
  system_quantity INTEGER NOT NULL DEFAULT 0 CHECK (system_quantity >= 0),
  actual_quantity INTEGER NOT NULL DEFAULT 0 CHECK (actual_quantity >= 0),
  difference INTEGER GENERATED ALWAYS AS (actual_quantity - system_quantity) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (stocktake_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_inventory_stocktakes_club ON public.inventory_stocktakes (club_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- Zamówienia
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.inventory_suppliers (id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status public.inventory_order_status NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_delivery DATE,
  notes TEXT,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, order_number)
);

CREATE TABLE IF NOT EXISTS public.inventory_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.inventory_purchase_orders (id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) CHECK (unit_price IS NULL OR unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_orders_club_status ON public.inventory_purchase_orders (club_id, status);

-- ---------------------------------------------------------------------------
-- Raporty magazynowe
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.inventory_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  report_type public.inventory_report_type NOT NULL,
  period_start DATE,
  period_end DATE,
  content JSONB NOT NULL DEFAULT '{}'::JSONB,
  status public.inventory_report_status NOT NULL DEFAULT 'draft',
  generated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_inventory_reports_club ON public.inventory_reports (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggery updated_at
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS inventory_suppliers_set_updated_at ON public.inventory_suppliers;
CREATE TRIGGER inventory_suppliers_set_updated_at BEFORE UPDATE ON public.inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inventory_items_set_updated_at ON public.inventory_items;
CREATE TRIGGER inventory_items_set_updated_at BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inventory_damages_set_updated_at ON public.inventory_damages;
CREATE TRIGGER inventory_damages_set_updated_at BEFORE UPDATE ON public.inventory_damages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inventory_player_kits_set_updated_at ON public.inventory_player_kits;
CREATE TRIGGER inventory_player_kits_set_updated_at BEFORE UPDATE ON public.inventory_player_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inventory_stocktakes_set_updated_at ON public.inventory_stocktakes;
CREATE TRIGGER inventory_stocktakes_set_updated_at BEFORE UPDATE ON public.inventory_stocktakes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inventory_purchase_orders_set_updated_at ON public.inventory_purchase_orders;
CREATE TRIGGER inventory_purchase_orders_set_updated_at BEFORE UPDATE ON public.inventory_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS inventory_reports_set_updated_at ON public.inventory_reports;
CREATE TRIGGER inventory_reports_set_updated_at BEFORE UPDATE ON public.inventory_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Spójność club_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_inventory_item_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_categories c
    WHERE c.id = NEW.category_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'category_id does not belong to club_id';
  END IF;
  IF NEW.supplier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_suppliers s
    WHERE s.id = NEW.supplier_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'supplier_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_items_enforce_club ON public.inventory_items;
CREATE TRIGGER inventory_items_enforce_club BEFORE INSERT OR UPDATE OF category_id, supplier_id, club_id ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_item_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_transaction_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_transactions_enforce_club ON public.inventory_transactions;
CREATE TRIGGER inventory_transactions_enforce_club BEFORE INSERT OR UPDATE OF item_id, player_id, club_id ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_transaction_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_return_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_returns_enforce_club ON public.inventory_returns;
CREATE TRIGGER inventory_returns_enforce_club BEFORE INSERT OR UPDATE OF item_id, club_id ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_return_club_consistency();

-- ---------------------------------------------------------------------------
-- Automatyczna aktualizacja stanów magazynowych
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.refresh_inventory_item_status(p_item_id UUID)
RETURNS VOID LANGUAGE plpgsql AS $$
DECLARE
  v RECORD;
BEGIN
  SELECT * INTO v FROM public.inventory_items WHERE id = p_item_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF v.quantity_total = 0 THEN
-- [stripped: UPDATE]
  ELSIF v.quantity_damaged > 0 AND v.quantity_available = 0 AND v.quantity_issued = 0 THEN
-- [stripped: UPDATE]
  ELSIF v.quantity_issued > 0 AND v.quantity_available = 0 THEN
-- [stripped: UPDATE]
  ELSIF v.quantity_available > 0 THEN
-- [stripped: UPDATE]
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_inventory_issue()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT quantity_available INTO v_available
  FROM public.inventory_items WHERE id = NEW.item_id FOR UPDATE;

  IF v_available IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF v_available < NEW.quantity THEN
    RAISE EXCEPTION 'insufficient available quantity';
  END IF;

-- [stripped: UPDATE]

  PERFORM public.refresh_inventory_item_status(NEW.item_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_transactions_apply_issue ON public.inventory_transactions;
CREATE TRIGGER inventory_transactions_apply_issue AFTER INSERT ON public.inventory_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_issue();

CREATE OR REPLACE FUNCTION public.apply_inventory_return()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_issued INTEGER;
BEGIN
  SELECT quantity_issued INTO v_issued
  FROM public.inventory_items WHERE id = NEW.item_id FOR UPDATE;

  IF v_issued IS NULL THEN
    RAISE EXCEPTION 'item not found';
  END IF;
  IF v_issued < NEW.quantity THEN
    RAISE EXCEPTION 'return quantity exceeds issued quantity';
  END IF;

  IF NEW.condition = 'functional' THEN
-- [stripped: UPDATE]
  ELSIF NEW.condition = 'damaged' THEN
-- [stripped: UPDATE]
  ELSIF NEW.condition = 'lost' THEN
-- [stripped: UPDATE]
  END IF;

  PERFORM public.refresh_inventory_item_status(NEW.item_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_returns_apply_return ON public.inventory_returns;
CREATE TRIGGER inventory_returns_apply_return AFTER INSERT ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.apply_inventory_return();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_manage_inventory(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_inventory(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_issue_inventory(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_read_inventory(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_own_inventory(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_inventory(p_club_id)
      OR p_player_id = public.player_id_for_user(p_club_id, auth.uid())
    );
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_returns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_damages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_player_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_kit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocktakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_stocktake_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_purchase_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inventory_categories_select ON public.inventory_categories;
CREATE POLICY inventory_categories_select ON public.inventory_categories FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id) OR public.player_id_for_user(club_id, auth.uid()) IS NOT NULL);
DROP POLICY IF EXISTS inventory_categories_manage ON public.inventory_categories;
CREATE POLICY inventory_categories_manage ON public.inventory_categories FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_suppliers_select ON public.inventory_suppliers;
CREATE POLICY inventory_suppliers_select ON public.inventory_suppliers FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
DROP POLICY IF EXISTS inventory_suppliers_manage ON public.inventory_suppliers;
CREATE POLICY inventory_suppliers_manage ON public.inventory_suppliers FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_items_select ON public.inventory_items;
CREATE POLICY inventory_items_select ON public.inventory_items FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
DROP POLICY IF EXISTS inventory_items_manage ON public.inventory_items;
CREATE POLICY inventory_items_manage ON public.inventory_items FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_transactions_select ON public.inventory_transactions;
CREATE POLICY inventory_transactions_select ON public.inventory_transactions FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR player_id = public.player_id_for_user(club_id, auth.uid())
  );
DROP POLICY IF EXISTS inventory_transactions_insert ON public.inventory_transactions;
CREATE POLICY inventory_transactions_insert ON public.inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_inventory(club_id));
DROP POLICY IF EXISTS inventory_transactions_manage ON public.inventory_transactions;
CREATE POLICY inventory_transactions_manage ON public.inventory_transactions FOR UPDATE TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));
DROP POLICY IF EXISTS inventory_transactions_delete ON public.inventory_transactions;
CREATE POLICY inventory_transactions_delete ON public.inventory_transactions FOR DELETE TO authenticated
  USING (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_returns_select ON public.inventory_returns;
CREATE POLICY inventory_returns_select ON public.inventory_returns FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR EXISTS (
      SELECT 1 FROM public.inventory_transactions t
      WHERE t.id = transaction_id
        AND t.player_id = public.player_id_for_user(club_id, auth.uid())
    )
  );
DROP POLICY IF EXISTS inventory_returns_insert ON public.inventory_returns;
CREATE POLICY inventory_returns_insert ON public.inventory_returns FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_inventory(club_id));
DROP POLICY IF EXISTS inventory_returns_manage ON public.inventory_returns;
CREATE POLICY inventory_returns_manage ON public.inventory_returns FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_damages_select ON public.inventory_damages;
CREATE POLICY inventory_damages_select ON public.inventory_damages FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
DROP POLICY IF EXISTS inventory_damages_manage ON public.inventory_damages;
CREATE POLICY inventory_damages_manage ON public.inventory_damages FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_player_kits_select ON public.inventory_player_kits;
CREATE POLICY inventory_player_kits_select ON public.inventory_player_kits FOR SELECT TO authenticated
  USING (public.actor_can_read_own_inventory(club_id, player_id));
DROP POLICY IF EXISTS inventory_player_kits_manage ON public.inventory_player_kits;
CREATE POLICY inventory_player_kits_manage ON public.inventory_player_kits FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_kit_assignments_select ON public.inventory_kit_assignments;
CREATE POLICY inventory_kit_assignments_select ON public.inventory_kit_assignments FOR SELECT TO authenticated
  USING (public.actor_can_read_own_inventory(club_id, player_id));
DROP POLICY IF EXISTS inventory_kit_assignments_manage ON public.inventory_kit_assignments;
CREATE POLICY inventory_kit_assignments_manage ON public.inventory_kit_assignments FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_stocktakes_select ON public.inventory_stocktakes;
CREATE POLICY inventory_stocktakes_select ON public.inventory_stocktakes FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
DROP POLICY IF EXISTS inventory_stocktakes_manage ON public.inventory_stocktakes;
CREATE POLICY inventory_stocktakes_manage ON public.inventory_stocktakes FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_stocktake_lines_select ON public.inventory_stocktake_lines;
CREATE POLICY inventory_stocktake_lines_select ON public.inventory_stocktake_lines FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
DROP POLICY IF EXISTS inventory_stocktake_lines_manage ON public.inventory_stocktake_lines;
CREATE POLICY inventory_stocktake_lines_manage ON public.inventory_stocktake_lines FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_purchase_orders_select ON public.inventory_purchase_orders;
CREATE POLICY inventory_purchase_orders_select ON public.inventory_purchase_orders FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
DROP POLICY IF EXISTS inventory_purchase_orders_manage ON public.inventory_purchase_orders;
CREATE POLICY inventory_purchase_orders_manage ON public.inventory_purchase_orders FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_purchase_order_lines_select ON public.inventory_purchase_order_lines;
CREATE POLICY inventory_purchase_order_lines_select ON public.inventory_purchase_order_lines FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
DROP POLICY IF EXISTS inventory_purchase_order_lines_manage ON public.inventory_purchase_order_lines;
CREATE POLICY inventory_purchase_order_lines_manage ON public.inventory_purchase_order_lines FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

DROP POLICY IF EXISTS inventory_reports_select ON public.inventory_reports;
CREATE POLICY inventory_reports_select ON public.inventory_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_inventory(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );
DROP POLICY IF EXISTS inventory_reports_manage ON public.inventory_reports;
CREATE POLICY inventory_reports_manage ON public.inventory_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

-- Storage: zdjęcia magazynowe
DROP POLICY IF EXISTS club_assets_inventory_select ON storage.objects;
CREATE POLICY club_assets_inventory_select ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_inventory(public.storage_club_id_from_path(name))
  );

DROP POLICY IF EXISTS club_assets_inventory_insert ON storage.objects;
CREATE POLICY club_assets_inventory_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.actor_can_manage_inventory(public.storage_club_id_from_path(name))
  );

DROP POLICY IF EXISTS club_assets_inventory_delete ON storage.objects;
CREATE POLICY club_assets_inventory_delete ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.actor_can_manage_inventory(public.storage_club_id_from_path(name))
  );

-- AI category
-- [stripped: INSERT]

-- GRANT
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_suppliers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_transactions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_returns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_damages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_player_kits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_kit_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stocktakes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_stocktake_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_purchase_orders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_purchase_order_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_reports TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_inventory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_inventory(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_issue_inventory(UUID) TO authenticated;


-- --- Source: 20260602102000_inventory_audit_hardening.sql ---

-- ETAP 8 audit: RPC dashboardu, AI RLS, indeksy

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
        p_category IN ('management', 'sponsors', 'finance', 'inventory')
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

CREATE OR REPLACE FUNCTION public.get_inventory_dashboard_stats(p_club_id UUID)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_items', COALESCE((SELECT COUNT(*)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'total_quantity', COALESCE((SELECT SUM(quantity_total) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'available_quantity', COALESCE((SELECT SUM(quantity_available) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'issued_quantity', COALESCE((SELECT SUM(quantity_issued) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'damaged_quantity', COALESCE((SELECT SUM(quantity_damaged) FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'low_stock_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_items
      WHERE club_id = p_club_id AND min_stock_level > 0 AND quantity_available <= min_stock_level
    ), 0),
    'out_of_stock_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_items
      WHERE club_id = p_club_id AND quantity_available = 0 AND status != 'retired'
    ), 0),
    'balls_available', COALESCE((
      SELECT SUM(i.quantity_available) FROM public.inventory_items i
      JOIN public.inventory_categories c ON c.id = i.category_id
      WHERE i.club_id = p_club_id AND c.slug = 'balls'
    ), 0),
    'open_damages_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_damages
      WHERE club_id = p_club_id AND status IN ('reported', 'in_repair', 'replacement_needed')
    ), 0),
    'open_orders_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_purchase_orders
      WHERE club_id = p_club_id AND status IN ('draft', 'ordered', 'in_progress')
    ), 0)
  )
  WHERE public.actor_can_read_inventory(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_dashboard_stats(UUID) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_open
  ON public.inventory_transactions (club_id, expected_return_date)
  WHERE expected_return_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_damages_open
  ON public.inventory_damages (club_id, status)
  WHERE status IN ('reported', 'in_repair', 'replacement_needed');


-- --- Source: 20260602103000_inventory_audit_hardening.sql ---

-- ETAP 8 audit: spójność stanów, zwroty, RLS, wydajność raportów

-- Spójność transaction_id przy zwrocie
CREATE OR REPLACE FUNCTION public.enforce_inventory_return_transaction_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.transaction_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_transactions t
    WHERE t.id = NEW.transaction_id
      AND t.club_id = NEW.club_id
      AND t.item_id = NEW.item_id
  ) THEN
    RAISE EXCEPTION 'transaction_id does not match item_id or club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_returns_enforce_transaction ON public.inventory_returns;
DROP TRIGGER IF EXISTS inventory_returns_enforce_transaction ON public.inventory_returns;
CREATE TRIGGER inventory_returns_enforce_transaction BEFORE INSERT OR UPDATE OF transaction_id, item_id, club_id ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_return_transaction_consistency();

-- Limit zwrotu względem wydania powiązanego
CREATE OR REPLACE FUNCTION public.enforce_inventory_return_transaction_cap()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_tx_qty INTEGER;
  v_returned INTEGER;
BEGIN
  IF NEW.transaction_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT quantity INTO v_tx_qty
  FROM public.inventory_transactions
  WHERE id = NEW.transaction_id AND club_id = NEW.club_id AND item_id = NEW.item_id;

  IF v_tx_qty IS NULL THEN
    RAISE EXCEPTION 'transaction_id not found';
  END IF;

  SELECT COALESCE(SUM(r.quantity), 0) INTO v_returned
  FROM public.inventory_returns r
  WHERE r.transaction_id = NEW.transaction_id;

  IF (v_returned + NEW.quantity) > v_tx_qty THEN
    RAISE EXCEPTION 'return exceeds issued transaction quantity';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_returns_cap ON public.inventory_returns;
DROP TRIGGER IF EXISTS inventory_returns_cap ON public.inventory_returns;
CREATE TRIGGER inventory_returns_cap BEFORE INSERT ON public.inventory_returns
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_return_transaction_cap();

-- Spójność club_id: kit assignments, damages, stocktake lines, order lines
CREATE OR REPLACE FUNCTION public.enforce_inventory_kit_assignment_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.players p WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'player_id does not belong to club_id';
  END IF;
  IF NEW.item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  IF NEW.transaction_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_transactions t
    WHERE t.id = NEW.transaction_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'transaction_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_kit_assignments_enforce_club ON public.inventory_kit_assignments;
DROP TRIGGER IF EXISTS inventory_kit_assignments_enforce_club ON public.inventory_kit_assignments;
CREATE TRIGGER inventory_kit_assignments_enforce_club BEFORE INSERT OR UPDATE OF player_id, item_id, transaction_id, club_id ON public.inventory_kit_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_kit_assignment_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_damage_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_damages_enforce_club ON public.inventory_damages;
DROP TRIGGER IF EXISTS inventory_damages_enforce_club ON public.inventory_damages;
CREATE TRIGGER inventory_damages_enforce_club BEFORE INSERT OR UPDATE OF item_id, club_id ON public.inventory_damages
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_damage_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_stocktake_line_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_stocktakes s
    WHERE s.id = NEW.stocktake_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'stocktake_id does not belong to club_id';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_stocktake_lines_enforce_club ON public.inventory_stocktake_lines;
DROP TRIGGER IF EXISTS inventory_stocktake_lines_enforce_club ON public.inventory_stocktake_lines;
CREATE TRIGGER inventory_stocktake_lines_enforce_club BEFORE INSERT OR UPDATE OF stocktake_id, item_id, club_id ON public.inventory_stocktake_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_stocktake_line_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_inventory_order_line_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.inventory_purchase_orders o
    WHERE o.id = NEW.order_id AND o.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'order_id does not belong to club_id';
  END IF;
  IF NEW.item_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.inventory_items i WHERE i.id = NEW.item_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'item_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_purchase_order_lines_enforce_club ON public.inventory_purchase_order_lines;
DROP TRIGGER IF EXISTS inventory_purchase_order_lines_enforce_club ON public.inventory_purchase_order_lines;
CREATE TRIGGER inventory_purchase_order_lines_enforce_club BEFORE INSERT OR UPDATE OF order_id, item_id, club_id ON public.inventory_purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION public.enforce_inventory_order_line_club_consistency();

-- Wzmocnione helpery RLS
CREATE OR REPLACE FUNCTION public.actor_can_manage_inventory(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_inventory(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_read_own_inventory(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_inventory(p_club_id)
      OR (
        public.user_has_club_role(p_club_id, ARRAY['player']::public.club_role[])
        AND p_player_id = public.player_id_for_user(p_club_id, auth.uid())
      )
    );
$$;

-- Kategorie magazynu: tylko staff (zawodnik nie potrzebuje pełnego słownika)
DROP POLICY IF EXISTS "inventory_categories_select" ON public.inventory_categories;
DROP POLICY IF EXISTS inventory_categories_select ON public.inventory_categories;
CREATE POLICY inventory_categories_select ON public.inventory_categories FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));

-- Zwroty zawodnika: tylko powiązane z jego wydaniami
DROP POLICY IF EXISTS "inventory_returns_select" ON public.inventory_returns;
DROP POLICY IF EXISTS inventory_returns_select ON public.inventory_returns;
CREATE POLICY inventory_returns_select ON public.inventory_returns FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR EXISTS (
      SELECT 1 FROM public.inventory_transactions t
      WHERE t.id = transaction_id
        AND t.club_id = club_id
        AND t.player_id = public.player_id_for_user(club_id, auth.uid())
    )
  );

-- Raporty: trener wyłącznie opublikowane (spójnie z finansami)
DROP POLICY IF EXISTS "inventory_reports_select" ON public.inventory_reports;
DROP POLICY IF EXISTS inventory_reports_select ON public.inventory_reports;
CREATE POLICY inventory_reports_select ON public.inventory_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_inventory(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );

-- Naprawa błędnych stanów z seeda (uszkodzenia na wydanych pozycjach)
-- [stripped: UPDATE]

-- Agregaty raportów bez ładowania wszystkich pozycji
CREATE OR REPLACE FUNCTION public.get_inventory_report_summary(
  p_club_id UUID,
  p_period_start DATE DEFAULT NULL,
  p_period_end DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_items', COALESCE((SELECT COUNT(*)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id), 0),
    'low_stock_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_items
      WHERE club_id = p_club_id AND min_stock_level > 0 AND quantity_available <= min_stock_level
    ), 0),
    'damaged_count', COALESCE((
      SELECT SUM(quantity_damaged)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id
    ), 0),
    'issued_count', COALESCE((
      SELECT SUM(quantity_issued)::INTEGER FROM public.inventory_items WHERE club_id = p_club_id
    ), 0),
    'issues_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_transactions
      WHERE club_id = p_club_id
        AND issue_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND issue_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'balls_issued', COALESCE((
      SELECT SUM(t.quantity)::INTEGER FROM public.inventory_transactions t
      JOIN public.inventory_items i ON i.id = t.item_id
      JOIN public.inventory_categories c ON c.id = i.category_id
      WHERE t.club_id = p_club_id
        AND c.slug = 'balls'
        AND t.issue_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND t.issue_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'kits_issued', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_transactions
      WHERE club_id = p_club_id
        AND recipient_type = 'player'
        AND issue_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND issue_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'damages_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_damages
      WHERE club_id = p_club_id
        AND damage_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND damage_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0),
    'replacement_needed', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.inventory_damages
      WHERE club_id = p_club_id
        AND status = 'replacement_needed'
        AND damage_date >= COALESCE(p_period_start, DATE '1900-01-01')
        AND damage_date <= COALESCE(p_period_end, DATE '2099-12-31')
    ), 0)
  )
  WHERE public.actor_can_read_inventory(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_inventory_report_summary(UUID, DATE, DATE) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_inventory_returns_transaction
  ON public.inventory_returns (transaction_id)
  WHERE transaction_id IS NOT NULL;

-- Odśwież statusy po naprawie seeda
-- [stripped: club-specific or maintenance SELECT]


-- --- Source: 20260604100000_integrations_module.sql ---

-- ETAP 10: Integracje z systemami rozgrywkowymi (PZPN, DZPN, Extranet, importy)

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'integrations';

DO $$ BEGIN
  CREATE TYPE public.integration_provider AS ENUM (
  'pzpn',
  'dzpn',
  'extranet',
  'manual',
  'other'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.integration_data_format AS ENUM (
  'api',
  'json',
  'xml',
  'csv',
  'rss',
  'file',
  'manual'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.integration_connection_status AS ENUM (
  'not_configured',
  'ready',
  'disabled',
  'error'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_job_type AS ENUM (
  'league_table',
  'fixtures',
  'results',
  'full'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_trigger_type AS ENUM (
  'manual',
  'automatic',
  'import'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_job_status AS ENUM (
  'pending',
  'running',
  'completed',
  'failed',
  'cancelled'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_log_status AS ENUM (
  'success',
  'partial',
  'error'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.sync_conflict_status AS ENUM (
  'pending',
  'keep_local',
  'keep_external',
  'merged',
  'dismissed'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.integration_import_type AS ENUM (
  'league_table',
  'fixtures',
  'results'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.integration_import_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'partial'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Konfiguracja integracji (jedna na provider × klub)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  status public.integration_connection_status NOT NULL DEFAULT 'not_configured',
  base_url TEXT,
  api_key_configured BOOLEAN NOT NULL DEFAULT FALSE,
  auto_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  auto_sync_interval_minutes INTEGER NOT NULL DEFAULT 1440 CHECK (auto_sync_interval_minutes >= 15),
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider)
);

DROP TRIGGER IF EXISTS integrations_set_updated_at ON public.integrations;
CREATE TRIGGER integrations_set_updated_at BEFORE UPDATE ON public.integrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_integrations_club ON public.integrations (club_id);

-- ---------------------------------------------------------------------------
-- Źródła danych (API, pliki, RSS, ręczne)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integration_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID NOT NULL REFERENCES public.integrations (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format public.integration_data_format NOT NULL DEFAULT 'manual',
  source_url TEXT,
  file_path TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS integration_sources_set_updated_at ON public.integration_sources;
CREATE TRIGGER integration_sources_set_updated_at BEFORE UPDATE ON public.integration_sources
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_integration_sources_club ON public.integration_sources (club_id, integration_id);

-- ---------------------------------------------------------------------------
-- Mapowanie nazw klubu (Piorun Wawrzeńczyce ↔ GLKS Mietków)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integration_club_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  public_name TEXT NOT NULL,
  league_name TEXT NOT NULL,
  external_club_id TEXT,
  provider public.integration_provider,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, public_name, league_name)
);

DROP TRIGGER IF EXISTS integration_club_mappings_set_updated_at ON public.integration_club_mappings;
CREATE TRIGGER integration_club_mappings_set_updated_at BEFORE UPDATE ON public.integration_club_mappings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Zewnętrzne ligi / rozgrywki
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.external_leagues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  external_name TEXT NOT NULL,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id, season)
);

DROP TRIGGER IF EXISTS external_leagues_set_updated_at ON public.external_leagues;
CREATE TRIGGER external_leagues_set_updated_at BEFORE UPDATE ON public.external_leagues
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Mapowanie drużyn (Seniorzy, Juniorzy, …)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.external_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  external_name TEXT NOT NULL,
  category_label TEXT NOT NULL,
  competition TEXT,
  season TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id, season)
);

DROP TRIGGER IF EXISTS external_teams_set_updated_at ON public.external_teams;
CREATE TRIGGER external_teams_set_updated_at BEFORE UPDATE ON public.external_teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_external_teams_club ON public.external_teams (club_id, team_id);

-- ---------------------------------------------------------------------------
-- Zewnętrzne mecze (staging przed synchronizacją)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.external_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  external_league_id UUID REFERENCES public.external_leagues (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  external_id TEXT NOT NULL,
  competition TEXT NOT NULL,
  season TEXT NOT NULL,
  round_number INTEGER,
  match_date DATE NOT NULL,
  match_time TIME NOT NULL DEFAULT '15:00',
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled',
  match_id UUID REFERENCES public.matches (id) ON DELETE SET NULL,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, provider, external_id)
);

DROP TRIGGER IF EXISTS external_matches_set_updated_at ON public.external_matches;
CREATE TRIGGER external_matches_set_updated_at BEFORE UPDATE ON public.external_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_external_matches_club_date ON public.external_matches (club_id, match_date DESC);

-- ---------------------------------------------------------------------------
-- Zadania synchronizacji
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations (id) ON DELETE SET NULL,
  job_type public.sync_job_type NOT NULL,
  trigger_type public.sync_trigger_type NOT NULL DEFAULT 'manual',
  status public.sync_job_status NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_club ON public.sync_jobs (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Logi synchronizacji
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.integrations (id) ON DELETE SET NULL,
  sync_job_id UUID REFERENCES public.sync_jobs (id) ON DELETE SET NULL,
  source_id UUID REFERENCES public.integration_sources (id) ON DELETE SET NULL,
  provider public.integration_provider NOT NULL,
  job_type public.sync_job_type NOT NULL,
  trigger_type public.sync_trigger_type NOT NULL DEFAULT 'manual',
  status public.sync_log_status NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  quality_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_club ON public.sync_logs (club_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_logs_status ON public.sync_logs (club_id, status);

-- ---------------------------------------------------------------------------
-- Konflikty synchronizacji (administrator decyduje)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  sync_log_id UUID NOT NULL REFERENCES public.sync_logs (id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_key TEXT NOT NULL,
  local_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  status public.sync_conflict_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_sync_conflicts_pending ON public.sync_conflicts (club_id, status)
  WHERE status = 'pending';

-- ---------------------------------------------------------------------------
-- Import plików (CSV, JSON, …)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.integration_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  format public.integration_data_format NOT NULL,
  import_type public.integration_import_type NOT NULL,
  status public.integration_import_status NOT NULL DEFAULT 'pending',
  rows_total INTEGER NOT NULL DEFAULT 0,
  rows_imported INTEGER NOT NULL DEFAULT 0,
  rows_failed INTEGER NOT NULL DEFAULT 0,
  quality_issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  sync_log_id UUID REFERENCES public.sync_logs (id) ON DELETE SET NULL,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_integration_imports_club ON public.integration_imports (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_integrations(p_club_id UUID)
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

CREATE OR REPLACE FUNCTION public.actor_can_manage_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_sync_integrations(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_manage_integrations(p_club_id);
$$;

-- ---------------------------------------------------------------------------
-- RLS policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_club_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS integrations_select ON public.integrations;
CREATE POLICY integrations_select ON public.integrations FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS integrations_manage ON public.integrations;
CREATE POLICY integrations_manage ON public.integrations FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

DROP POLICY IF EXISTS integration_sources_select ON public.integration_sources;
CREATE POLICY integration_sources_select ON public.integration_sources FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS integration_sources_manage ON public.integration_sources;
CREATE POLICY integration_sources_manage ON public.integration_sources FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

DROP POLICY IF EXISTS integration_club_mappings_select ON public.integration_club_mappings;
CREATE POLICY integration_club_mappings_select ON public.integration_club_mappings FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS integration_club_mappings_manage ON public.integration_club_mappings;
CREATE POLICY integration_club_mappings_manage ON public.integration_club_mappings FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

DROP POLICY IF EXISTS external_leagues_select ON public.external_leagues;
CREATE POLICY external_leagues_select ON public.external_leagues FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS external_leagues_manage ON public.external_leagues;
CREATE POLICY external_leagues_manage ON public.external_leagues FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

DROP POLICY IF EXISTS external_teams_select ON public.external_teams;
CREATE POLICY external_teams_select ON public.external_teams FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS external_teams_manage ON public.external_teams;
CREATE POLICY external_teams_manage ON public.external_teams FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

DROP POLICY IF EXISTS external_matches_select ON public.external_matches;
CREATE POLICY external_matches_select ON public.external_matches FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS external_matches_manage ON public.external_matches;
CREATE POLICY external_matches_manage ON public.external_matches FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

DROP POLICY IF EXISTS sync_jobs_select ON public.sync_jobs;
CREATE POLICY sync_jobs_select ON public.sync_jobs FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS sync_jobs_insert ON public.sync_jobs;
CREATE POLICY sync_jobs_insert ON public.sync_jobs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

DROP POLICY IF EXISTS sync_jobs_update ON public.sync_jobs;
CREATE POLICY sync_jobs_update ON public.sync_jobs FOR UPDATE TO authenticated
  USING (public.actor_can_sync_integrations(club_id))
  WITH CHECK (public.actor_can_sync_integrations(club_id));

DROP POLICY IF EXISTS sync_logs_select ON public.sync_logs;
CREATE POLICY sync_logs_select ON public.sync_logs FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS sync_logs_insert ON public.sync_logs;
CREATE POLICY sync_logs_insert ON public.sync_logs FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

DROP POLICY IF EXISTS sync_conflicts_select ON public.sync_conflicts;
CREATE POLICY sync_conflicts_select ON public.sync_conflicts FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS sync_conflicts_manage ON public.sync_conflicts;
CREATE POLICY sync_conflicts_manage ON public.sync_conflicts FOR ALL TO authenticated
  USING (public.actor_can_manage_integrations(club_id))
  WITH CHECK (public.actor_can_manage_integrations(club_id));

DROP POLICY IF EXISTS integration_imports_select ON public.integration_imports;
CREATE POLICY integration_imports_select ON public.integration_imports FOR SELECT TO authenticated
  USING (public.actor_can_read_integrations(club_id));

DROP POLICY IF EXISTS integration_imports_insert ON public.integration_imports;
CREATE POLICY integration_imports_insert ON public.integration_imports FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_sync_integrations(club_id));

DROP POLICY IF EXISTS integration_imports_update ON public.integration_imports;
CREATE POLICY integration_imports_update ON public.integration_imports FOR UPDATE TO authenticated
  USING (public.actor_can_sync_integrations(club_id))
  WITH CHECK (public.actor_can_sync_integrations(club_id));


-- --- Source: 20260604102000_integrations_audit_hardening.sql ---

-- ETAP 10 audit: GRANTs, spójność club_id, indeksy

-- ---------------------------------------------------------------------------
-- Spójność club_id (defense-in-depth)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_integration_source_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = NEW.integration_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'integration_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS integration_sources_enforce_club ON public.integration_sources;
DROP TRIGGER IF EXISTS integration_sources_enforce_club ON public.integration_sources;
CREATE TRIGGER integration_sources_enforce_club BEFORE INSERT OR UPDATE OF integration_id, club_id ON public.integration_sources
  FOR EACH ROW EXECUTE FUNCTION public.enforce_integration_source_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_external_team_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.team_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = NEW.team_id AND t.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'team_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS external_teams_enforce_club ON public.external_teams;
DROP TRIGGER IF EXISTS external_teams_enforce_club ON public.external_teams;
CREATE TRIGGER external_teams_enforce_club BEFORE INSERT OR UPDATE OF team_id, club_id ON public.external_teams
  FOR EACH ROW EXECUTE FUNCTION public.enforce_external_team_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_external_match_league_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.external_league_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.external_leagues l
    WHERE l.id = NEW.external_league_id AND l.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'external_league_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS external_matches_enforce_league_club ON public.external_matches;
DROP TRIGGER IF EXISTS external_matches_enforce_league_club ON public.external_matches;
CREATE TRIGGER external_matches_enforce_league_club BEFORE INSERT OR UPDATE OF external_league_id, club_id ON public.external_matches
  FOR EACH ROW EXECUTE FUNCTION public.enforce_external_match_league_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sync_log_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.integration_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.integrations i
    WHERE i.id = NEW.integration_id AND i.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'integration_id does not belong to club_id on sync_logs';
  END IF;
  IF NEW.sync_job_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sync_jobs j
    WHERE j.id = NEW.sync_job_id AND j.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sync_job_id does not belong to club_id on sync_logs';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_logs_enforce_club ON public.sync_logs;
DROP TRIGGER IF EXISTS sync_logs_enforce_club ON public.sync_logs;
CREATE TRIGGER sync_logs_enforce_club BEFORE INSERT OR UPDATE ON public.sync_logs
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sync_log_club_consistency();

CREATE INDEX IF NOT EXISTS idx_sync_logs_club_status
  ON public.sync_logs (club_id, status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_external_matches_unsynced
  ON public.external_matches (club_id, competition, season)
  WHERE match_id IS NULL;

-- ---------------------------------------------------------------------------
-- GRANTs (wymagane dla authenticated + RLS)
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.integrations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_club_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_leagues TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_teams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.external_matches TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.sync_jobs TO authenticated;
GRANT SELECT, INSERT ON public.sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sync_conflicts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.integration_imports TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_integrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_integrations(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_sync_integrations(UUID) TO authenticated;


-- --- Source: 20260605100000_academy_module.sql ---

-- ETAP 11: Akademia klubowa, rozwój zawodników, skauting

ALTER TYPE public.club_role ADD VALUE IF NOT EXISTS 'scout';

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'academy';
ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'scouting';

DO $$ BEGIN
  CREATE TYPE public.academy_age_group AS ENUM (
  'skrzaty',
  'zaki',
  'orliki',
  'mlodziki',
  'trampkarze',
  'juniorzy',
  'seniorzy'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.academy_staff_role AS ENUM (
  'head_coach',
  'assistant_coach',
  'goalkeeper_coach'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.player_goal_status AS ENUM (
  'active',
  'completed',
  'cancelled'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.fitness_test_type AS ENUM (
  'sprint_5m',
  'sprint_10m',
  'sprint_30m',
  'beep_test',
  'vertical_jump',
  'agility'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.scouting_player_status AS ENUM (
  'observed',
  'testing',
  'recommended',
  'rejected',
  'signed'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.scouting_club_type AS ENUM (
  'league_opponent',
  'academy',
  'partner'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.team_transition_type AS ENUM (
  'promotion',
  'demotion',
  'loan',
  'other'
);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Grupy akademii
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.academy_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  age_group public.academy_age_group NOT NULL,
  team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, age_group)
);

DROP TRIGGER IF EXISTS academy_groups_set_updated_at ON public.academy_groups;
CREATE TRIGGER academy_groups_set_updated_at BEFORE UPDATE ON public.academy_groups
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_academy_groups_club ON public.academy_groups (club_id);

CREATE TABLE IF NOT EXISTS public.academy_group_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.academy_groups (id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  staff_role public.academy_staff_role NOT NULL DEFAULT 'head_coach',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (group_id, profile_id, staff_role)
);

CREATE INDEX IF NOT EXISTS idx_academy_group_staff_club ON public.academy_group_staff (club_id, group_id);

-- ---------------------------------------------------------------------------
-- Profil rozwoju zawodnika
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_development (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  potential INTEGER NOT NULL DEFAULT 50 CHECK (potential BETWEEN 1 AND 100),
  development_level INTEGER NOT NULL DEFAULT 50 CHECK (development_level BETWEEN 1 AND 100),
  overall_rating INTEGER NOT NULL DEFAULT 50 CHECK (overall_rating BETWEEN 1 AND 100),
  notes TEXT,
  updated_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, player_id)
);

DROP TRIGGER IF EXISTS player_development_set_updated_at ON public.player_development;
CREATE TRIGGER player_development_set_updated_at BEFORE UPDATE ON public.player_development
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.player_development_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  potential INTEGER NOT NULL CHECK (potential BETWEEN 1 AND 100),
  development_level INTEGER NOT NULL CHECK (development_level BETWEEN 1 AND 100),
  overall_rating INTEGER NOT NULL CHECK (overall_rating BETWEEN 1 AND 100),
  note TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_player_development_history_player ON public.player_development_history (club_id, player_id, recorded_at DESC);

-- ---------------------------------------------------------------------------
-- Oceny trenerskie
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  assessor_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  assessed_at DATE NOT NULL DEFAULT CURRENT_DATE,
  technique SMALLINT NOT NULL CHECK (technique BETWEEN 1 AND 10),
  speed SMALLINT NOT NULL CHECK (speed BETWEEN 1 AND 10),
  motorics SMALLINT NOT NULL CHECK (motorics BETWEEN 1 AND 10),
  endurance SMALLINT NOT NULL CHECK (endurance BETWEEN 1 AND 10),
  strength SMALLINT NOT NULL CHECK (strength BETWEEN 1 AND 10),
  tactics SMALLINT NOT NULL CHECK (tactics BETWEEN 1 AND 10),
  engagement SMALLINT NOT NULL CHECK (engagement BETWEEN 1 AND 10),
  discipline SMALLINT NOT NULL CHECK (discipline BETWEEN 1 AND 10),
  cooperation SMALLINT NOT NULL CHECK (cooperation BETWEEN 1 AND 10),
  average_score NUMERIC(4, 2) NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_player_assessments_player ON public.player_assessments (club_id, player_id, assessed_at DESC);

-- ---------------------------------------------------------------------------
-- Cele rozwojowe
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status public.player_goal_status NOT NULL DEFAULT 'active',
  target_date DATE,
  completed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS player_goals_set_updated_at ON public.player_goals;
CREATE TRIGGER player_goals_set_updated_at BEFORE UPDATE ON public.player_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_player_goals_player ON public.player_goals (club_id, player_id, status);

-- ---------------------------------------------------------------------------
-- Testy motoryczne
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fitness_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  test_type public.fitness_test_type NOT NULL,
  result_value NUMERIC(10, 2) NOT NULL,
  unit TEXT NOT NULL,
  test_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  recorded_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_fitness_tests_player ON public.fitness_tests (club_id, player_id, test_date DESC);

-- ---------------------------------------------------------------------------
-- Przejścia między drużynami / grupami
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.player_team_transitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  from_age_group public.academy_age_group,
  to_age_group public.academy_age_group NOT NULL,
  from_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  to_team_id UUID REFERENCES public.teams (id) ON DELETE SET NULL,
  transition_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transition_type public.team_transition_type NOT NULL DEFAULT 'promotion',
  reason TEXT NOT NULL,
  decision_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_player_team_transitions_player ON public.player_team_transitions (club_id, player_id, transition_date DESC);

-- ---------------------------------------------------------------------------
-- Skauting — zawodnicy zewnętrzni
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scouting_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  external_club_name TEXT NOT NULL,
  position public.player_position NOT NULL,
  birth_date DATE,
  age_years INTEGER CHECK (age_years IS NULL OR age_years BETWEEN 5 AND 50),
  status public.scouting_player_status NOT NULL DEFAULT 'observed',
  notes TEXT,
  scouted_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  linked_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS scouting_players_set_updated_at ON public.scouting_players;
CREATE TRIGGER scouting_players_set_updated_at BEFORE UPDATE ON public.scouting_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_scouting_players_club ON public.scouting_players (club_id, status);

-- ---------------------------------------------------------------------------
-- Baza klubów obserwowanych
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scouting_clubs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  club_type public.scouting_club_type NOT NULL DEFAULT 'league_opponent',
  city TEXT,
  contact_info TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, name)
);

DROP TRIGGER IF EXISTS scouting_clubs_set_updated_at ON public.scouting_clubs;
CREATE TRIGGER scouting_clubs_set_updated_at BEFORE UPDATE ON public.scouting_clubs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Raporty skautingowe
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scouting_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  scouting_player_id UUID REFERENCES public.scouting_players (id) ON DELETE CASCADE,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  report_date DATE NOT NULL DEFAULT CURRENT_DATE,
  technique SMALLINT NOT NULL CHECK (technique BETWEEN 1 AND 10),
  motorics SMALLINT NOT NULL CHECK (motorics BETWEEN 1 AND 10),
  tactics SMALLINT NOT NULL CHECK (tactics BETWEEN 1 AND 10),
  character SMALLINT NOT NULL CHECK (character BETWEEN 1 AND 10),
  potential SMALLINT NOT NULL CHECK (potential BETWEEN 1 AND 10),
  final_rating SMALLINT NOT NULL CHECK (final_rating BETWEEN 1 AND 10),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_scouting_reports_club ON public.scouting_reports (club_id, report_date DESC);

-- ---------------------------------------------------------------------------
-- Analiza przeciwników
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.opponent_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  opponent_name TEXT NOT NULL,
  scouting_club_id UUID REFERENCES public.scouting_clubs (id) ON DELETE SET NULL,
  strengths TEXT NOT NULL DEFAULT '',
  weaknesses TEXT NOT NULL DEFAULT '',
  key_players TEXT NOT NULL DEFAULT '',
  tactical_setup TEXT NOT NULL DEFAULT '',
  analysis_date DATE NOT NULL DEFAULT CURRENT_DATE,
  author_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DROP TRIGGER IF EXISTS opponent_analysis_set_updated_at ON public.opponent_analysis;
CREATE TRIGGER opponent_analysis_set_updated_at BEFORE UPDATE ON public.opponent_analysis
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_opponent_analysis_club ON public.opponent_analysis (club_id, analysis_date DESC);

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.actor_can_read_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director','coach']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_scouting(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_manage_scouting(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','sports_director','coach','scout']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_own_development(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      p_player_id = public.player_id_for_user(p_club_id, auth.uid())
      OR p_player_id IN (SELECT public.parent_player_ids(p_club_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_development_row(
  p_club_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.actor_can_read_academy(p_club_id)
    OR public.actor_can_read_own_development(p_club_id, p_player_id);
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.academy_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academy_group_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_development_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_team_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_clubs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scouting_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opponent_analysis ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academy_groups_select ON public.academy_groups;
CREATE POLICY academy_groups_select ON public.academy_groups FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id) OR public.actor_can_read_scouting(club_id));
DROP POLICY IF EXISTS academy_groups_manage ON public.academy_groups;
CREATE POLICY academy_groups_manage ON public.academy_groups FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS academy_group_staff_select ON public.academy_group_staff;
CREATE POLICY academy_group_staff_select ON public.academy_group_staff FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id));
DROP POLICY IF EXISTS academy_group_staff_manage ON public.academy_group_staff;
CREATE POLICY academy_group_staff_manage ON public.academy_group_staff FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS player_development_select ON public.player_development;
CREATE POLICY player_development_select ON public.player_development FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
DROP POLICY IF EXISTS player_development_manage ON public.player_development;
CREATE POLICY player_development_manage ON public.player_development FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS player_development_history_select ON public.player_development_history;
CREATE POLICY player_development_history_select ON public.player_development_history FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
DROP POLICY IF EXISTS player_development_history_insert ON public.player_development_history;
CREATE POLICY player_development_history_insert ON public.player_development_history FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS player_assessments_select ON public.player_assessments;
CREATE POLICY player_assessments_select ON public.player_assessments FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
DROP POLICY IF EXISTS player_assessments_manage ON public.player_assessments;
CREATE POLICY player_assessments_manage ON public.player_assessments FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS player_goals_select ON public.player_goals;
CREATE POLICY player_goals_select ON public.player_goals FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
DROP POLICY IF EXISTS player_goals_manage ON public.player_goals;
CREATE POLICY player_goals_manage ON public.player_goals FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS fitness_tests_select ON public.fitness_tests;
CREATE POLICY fitness_tests_select ON public.fitness_tests FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
DROP POLICY IF EXISTS fitness_tests_manage ON public.fitness_tests;
CREATE POLICY fitness_tests_manage ON public.fitness_tests FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS player_team_transitions_select ON public.player_team_transitions;
CREATE POLICY player_team_transitions_select ON public.player_team_transitions FOR SELECT TO authenticated
  USING (public.actor_can_read_development_row(club_id, player_id));
DROP POLICY IF EXISTS player_team_transitions_manage ON public.player_team_transitions;
CREATE POLICY player_team_transitions_manage ON public.player_team_transitions FOR ALL TO authenticated
  USING (public.actor_can_manage_academy(club_id))
  WITH CHECK (public.actor_can_manage_academy(club_id));

DROP POLICY IF EXISTS scouting_players_select ON public.scouting_players;
CREATE POLICY scouting_players_select ON public.scouting_players FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
DROP POLICY IF EXISTS scouting_players_manage ON public.scouting_players;
CREATE POLICY scouting_players_manage ON public.scouting_players FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

DROP POLICY IF EXISTS scouting_clubs_select ON public.scouting_clubs;
CREATE POLICY scouting_clubs_select ON public.scouting_clubs FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
DROP POLICY IF EXISTS scouting_clubs_manage ON public.scouting_clubs;
CREATE POLICY scouting_clubs_manage ON public.scouting_clubs FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

DROP POLICY IF EXISTS scouting_reports_select ON public.scouting_reports;
CREATE POLICY scouting_reports_select ON public.scouting_reports FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
DROP POLICY IF EXISTS scouting_reports_manage ON public.scouting_reports;
CREATE POLICY scouting_reports_manage ON public.scouting_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));

DROP POLICY IF EXISTS opponent_analysis_select ON public.opponent_analysis;
CREATE POLICY opponent_analysis_select ON public.opponent_analysis FOR SELECT TO authenticated
  USING (public.actor_can_read_scouting(club_id));
DROP POLICY IF EXISTS opponent_analysis_manage ON public.opponent_analysis;
CREATE POLICY opponent_analysis_manage ON public.opponent_analysis FOR ALL TO authenticated
  USING (public.actor_can_manage_scouting(club_id))
  WITH CHECK (public.actor_can_manage_scouting(club_id));


-- --- Source: 20260605102000_academy_audit_hardening.sql ---

-- ETAP 11 audit: GRANTs, spójność club_id, indeksy

CREATE OR REPLACE FUNCTION public.enforce_academy_group_staff_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.academy_groups g
    WHERE g.id = NEW.group_id AND g.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'group_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS academy_group_staff_enforce_club ON public.academy_group_staff;
DROP TRIGGER IF EXISTS academy_group_staff_enforce_club ON public.academy_group_staff;
CREATE TRIGGER academy_group_staff_enforce_club BEFORE INSERT OR UPDATE OF group_id, club_id ON public.academy_group_staff
  FOR EACH ROW EXECUTE FUNCTION public.enforce_academy_group_staff_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_player_development_club_consistency()
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

DROP TRIGGER IF EXISTS player_development_enforce_club ON public.player_development;
DROP TRIGGER IF EXISTS player_development_enforce_club ON public.player_development;
CREATE TRIGGER player_development_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_development
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_development_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_scouting_report_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.scouting_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.scouting_players sp
    WHERE sp.id = NEW.scouting_player_id AND sp.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'scouting_player_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scouting_reports_enforce_club ON public.scouting_reports;
DROP TRIGGER IF EXISTS scouting_reports_enforce_club ON public.scouting_reports;
CREATE TRIGGER scouting_reports_enforce_club BEFORE INSERT OR UPDATE ON public.scouting_reports
  FOR EACH ROW EXECUTE FUNCTION public.enforce_scouting_report_club_consistency();

CREATE INDEX IF NOT EXISTS idx_player_assessments_club_date
  ON public.player_assessments (club_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_fitness_tests_club_type
  ON public.fitness_tests (club_id, test_type, test_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_group_staff TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_development TO authenticated;
GRANT SELECT, INSERT ON public.player_development_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_assessments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_goals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_tests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_team_transitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_players TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_clubs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scouting_reports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opponent_analysis TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_read_academy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_academy(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_scouting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_manage_scouting(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_own_development(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_development_row(UUID, UUID) TO authenticated;


-- --- Source: 20260605103000_academy_audit_fixes.sql ---

-- ETAP 11 audit fixes: RLS scope, team average aggregate, consistency triggers, indexes

-- Skaut ma wyłącznie dostęp do skautingu — bez odczytu profili rozwoju zawodników klubu
CREATE OR REPLACE FUNCTION public.actor_can_read_academy(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner','president','sports_director','coach']::public.club_role[]
    );
$$;

DROP POLICY IF EXISTS "academy_groups_select" ON public.academy_groups;
DROP POLICY IF EXISTS academy_groups_select ON public.academy_groups;
CREATE POLICY academy_groups_select ON public.academy_groups FOR SELECT TO authenticated
  USING (public.actor_can_read_academy(club_id));

-- Średnia drużyny bez ujawniania pojedynczych profili (zawodnik / rodzic na tej samej drużynie)
CREATE OR REPLACE FUNCTION public.team_development_average(
  p_club_id UUID,
  p_team_id UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_avg NUMERIC;
BEGIN
  IF p_team_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT (p_club_id IN (SELECT public.user_club_ids())) THEN
    RETURN NULL;
  END IF;

  IF public.actor_can_read_academy(p_club_id) THEN
    SELECT ROUND(AVG(pd.overall_rating)::numeric, 0) INTO v_avg
    FROM public.player_development pd
    JOIN public.players p ON p.id = pd.player_id
    WHERE pd.club_id = p_club_id AND p.team_id = p_team_id;
    RETURN v_avg;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.players p
    WHERE p.club_id = p_club_id
      AND p.team_id = p_team_id
      AND (
        p.id = public.player_id_for_user(p_club_id, auth.uid())
        OR p.id IN (SELECT public.parent_player_ids(p_club_id))
      )
  ) THEN
    SELECT ROUND(AVG(pd.overall_rating)::numeric, 0) INTO v_avg
    FROM public.player_development pd
    JOIN public.players p ON p.id = pd.player_id
    WHERE pd.club_id = p_club_id AND p.team_id = p_team_id;
    RETURN v_avg;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_player_row_club_consistency()
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

DROP TRIGGER IF EXISTS player_assessments_enforce_club ON public.player_assessments;
DROP TRIGGER IF EXISTS player_assessments_enforce_club ON public.player_assessments;
CREATE TRIGGER player_assessments_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_goals_enforce_club ON public.player_goals;
DROP TRIGGER IF EXISTS player_goals_enforce_club ON public.player_goals;
CREATE TRIGGER player_goals_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_goals
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS fitness_tests_enforce_club ON public.fitness_tests;
DROP TRIGGER IF EXISTS fitness_tests_enforce_club ON public.fitness_tests;
CREATE TRIGGER fitness_tests_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.fitness_tests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_team_transitions_enforce_club ON public.player_team_transitions;
DROP TRIGGER IF EXISTS player_team_transitions_enforce_club ON public.player_team_transitions;
CREATE TRIGGER player_team_transitions_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_team_transitions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

DROP TRIGGER IF EXISTS player_development_history_enforce_club ON public.player_development_history;
DROP TRIGGER IF EXISTS player_development_history_enforce_club ON public.player_development_history;
CREATE TRIGGER player_development_history_enforce_club BEFORE INSERT OR UPDATE OF player_id, club_id ON public.player_development_history
  FOR EACH ROW EXECUTE FUNCTION public.enforce_player_row_club_consistency();

CREATE INDEX IF NOT EXISTS idx_player_development_club_player
  ON public.player_development (club_id, player_id);

CREATE INDEX IF NOT EXISTS idx_scouting_reports_player
  ON public.scouting_reports (club_id, scouting_player_id, report_date DESC);

GRANT EXECUTE ON FUNCTION public.team_development_average(UUID, UUID) TO authenticated;


-- =============================================================================
-- SUPPLEMENT: audit hardening missing on prod
-- =============================================================================


-- --- Source: 20260531183000_matches_audit_hardening.sql ---

-- ETAP 4 audit (2): spójność zawodników w wydarzeniach/statystykach, walidacja tabeli

CREATE OR REPLACE FUNCTION public.enforce_match_event_players_team()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_team_id UUID;
BEGIN
  SELECT m.team_id INTO v_team_id FROM public.matches m
  WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id;

  IF NEW.player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'event player_id does not belong to match team';
  END IF;

  IF NEW.related_player_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.players p
    WHERE p.id = NEW.related_player_id AND p.club_id = NEW.club_id AND p.team_id = v_team_id
  ) THEN
    RAISE EXCEPTION 'event related_player_id does not belong to match team';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS match_events_enforce_players_team ON public.match_events;
DROP TRIGGER IF EXISTS match_events_enforce_players_team ON public.match_events;
CREATE TRIGGER match_events_enforce_players_team BEFORE INSERT OR UPDATE ON public.match_events
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_event_players_team();

DROP TRIGGER IF EXISTS match_player_stats_enforce_player_team ON public.match_player_stats;
DROP TRIGGER IF EXISTS match_player_stats_enforce_player_team ON public.match_player_stats;
CREATE TRIGGER match_player_stats_enforce_player_team BEFORE INSERT OR UPDATE ON public.match_player_stats
  FOR EACH ROW EXECUTE FUNCTION public.enforce_match_squad_player_team();

ALTER TABLE public.league_table_entries
  DROP CONSTRAINT IF EXISTS league_table_played_check;

DO $$ BEGIN
  ALTER TABLE public.league_table_entries ADD CONSTRAINT league_table_played_check CHECK (played = won + drawn + lost);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_league_table_points
  ON public.league_table_entries (club_id, competition, season, points DESC, goals_for DESC);

CREATE INDEX IF NOT EXISTS idx_match_events_club_match
  ON public.match_events (club_id, match_id);

CREATE INDEX IF NOT EXISTS idx_training_attendance_player_marked
  ON public.training_attendance (club_id, player_id, marked_at DESC);


-- --- Source: 20260617123000_stage15a_audit_hardening.sql ---

-- ETAP 15A audit: channel variant status, spójność referencji, RLS sponsorów, audyt approvals

CREATE OR REPLACE FUNCTION public.enforce_content_post_reference_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.match_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'match_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = NEW.video_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.sponsor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sponsors s
      WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'sponsor_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_report_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.video_reports vr
      WHERE vr.id = NEW.video_report_id AND vr.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_report_id does not belong to club_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_asset_reference_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.post_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.content_posts cp
      WHERE cp.id = NEW.post_id AND cp.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'post_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.videos v
      WHERE v.id = NEW.video_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_id does not belong to club_id';
    END IF;
  END IF;

  IF NEW.video_clip_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.video_clips vc
      JOIN public.videos v ON v.id = vc.video_id
      WHERE vc.id = NEW.video_clip_id AND v.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'video_clip_id does not belong to club_id';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_content_channel_variant_status()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('approved', 'published') THEN
    IF NOT public.actor_can_publish_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role for channel variant status %', NEW.status;
    END IF;
  END IF;

  IF NEW.status = 'queued' THEN
    IF NOT public.actor_can_manage_content(NEW.club_id) THEN
      RAISE EXCEPTION 'insufficient role to queue channel variant';
    END IF;
  END IF;

  IF NEW.status = 'published' AND NEW.published_at IS NULL THEN
    NEW.published_at := timezone('utc', now());
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS content_posts_enforce_references ON public.content_posts;
DROP TRIGGER IF EXISTS content_posts_enforce_references ON public.content_posts;
CREATE TRIGGER content_posts_enforce_references BEFORE INSERT OR UPDATE OF match_id, video_id, sponsor_id, video_report_id, club_id
  ON public.content_posts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_post_reference_consistency();

DROP TRIGGER IF EXISTS content_assets_enforce_references ON public.content_assets;
DROP TRIGGER IF EXISTS content_assets_enforce_references ON public.content_assets;
CREATE TRIGGER content_assets_enforce_references BEFORE INSERT OR UPDATE OF post_id, video_id, video_clip_id, club_id
  ON public.content_assets
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_asset_reference_consistency();

DROP TRIGGER IF EXISTS content_channel_variants_enforce_status ON public.content_channel_variants;
DROP TRIGGER IF EXISTS content_channel_variants_enforce_status ON public.content_channel_variants;
CREATE TRIGGER content_channel_variants_enforce_status BEFORE INSERT OR UPDATE OF status, published_at
  ON public.content_channel_variants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_content_channel_variant_status();

-- Warianty kanałów: coach tylko draft; publikacja/kolejka wymaga roli
DROP POLICY IF EXISTS content_channel_variants_manage ON public.content_channel_variants;

DROP POLICY IF EXISTS content_channel_variants_insert ON public.content_channel_variants;
CREATE POLICY content_channel_variants_insert ON public.content_channel_variants FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_create_content(club_id));

DROP POLICY IF EXISTS content_channel_variants_update ON public.content_channel_variants;
CREATE POLICY content_channel_variants_update ON public.content_channel_variants FOR UPDATE TO authenticated
  USING (public.actor_can_access_content_post(post_id))
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      public.actor_can_publish_content(club_id)
      OR status = 'draft'
    )
  );

DROP POLICY IF EXISTS content_channel_variants_delete ON public.content_channel_variants;
CREATE POLICY content_channel_variants_delete ON public.content_channel_variants FOR DELETE TO authenticated
  USING (public.actor_can_manage_content(club_id));

-- Audyt: coach może logować tylko submitted
DROP POLICY IF EXISTS content_approvals_insert ON public.content_approvals;
DROP POLICY IF EXISTS content_approvals_insert ON public.content_approvals;
CREATE POLICY content_approvals_insert ON public.content_approvals FOR INSERT TO authenticated
  WITH CHECK (
    public.actor_can_create_content(club_id)
    AND (
      action = 'submitted'
      OR public.actor_can_publish_content(club_id)
    )
  );

-- Sponsor widzi assety tylko powiązane z własnymi postami
DROP POLICY IF EXISTS content_assets_select ON public.content_assets;
DROP POLICY IF EXISTS content_assets_select ON public.content_assets;
CREATE POLICY content_assets_select ON public.content_assets FOR SELECT TO authenticated
  USING (
    public.actor_can_read_content(club_id)
    AND (
      public.actor_can_create_content(club_id)
      OR (
        public.actor_is_sponsor_user(club_id)
        AND post_id IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.content_posts cp
          WHERE cp.id = post_id
            AND cp.sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
        )
      )
    )
  );

COMMIT;

-- End prod-parity-patch (10 module files + 2 supplements)
