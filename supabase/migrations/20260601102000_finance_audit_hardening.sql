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
CREATE TRIGGER finance_fee_payments_cap
  BEFORE INSERT ON public.finance_player_fee_payments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_finance_fee_payment_cap();

ALTER TABLE public.finance_player_fees
  DROP CONSTRAINT IF EXISTS finance_player_fees_paid_lte_due_check;

ALTER TABLE public.finance_player_fees
  ADD CONSTRAINT finance_player_fees_paid_lte_due_check
  CHECK (amount_paid <= amount_due);

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
CREATE TRIGGER finance_income_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, grant_id, player_fee_id, club_id ON public.finance_income
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
CREATE TRIGGER finance_documents_enforce_club
  BEFORE INSERT OR UPDATE OF income_id, expense_id, grant_id, club_id ON public.finance_documents
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
CREATE TRIGGER finance_fee_plans_enforce_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.finance_fee_plans
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
CREATE TRIGGER finance_budgets_enforce_club
  BEFORE INSERT OR UPDATE OF team_id, club_id ON public.finance_budgets
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
CREATE POLICY "finance_reports_select" ON public.finance_reports FOR SELECT TO authenticated
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
UPDATE public.finance_player_fees
SET amount_paid = amount_paid;
