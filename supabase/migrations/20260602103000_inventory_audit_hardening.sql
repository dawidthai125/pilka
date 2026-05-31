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
CREATE TRIGGER inventory_returns_enforce_transaction
  BEFORE INSERT OR UPDATE OF transaction_id, item_id, club_id ON public.inventory_returns
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
CREATE TRIGGER inventory_returns_cap
  BEFORE INSERT ON public.inventory_returns
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
CREATE TRIGGER inventory_kit_assignments_enforce_club
  BEFORE INSERT OR UPDATE OF player_id, item_id, transaction_id, club_id ON public.inventory_kit_assignments
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
CREATE TRIGGER inventory_damages_enforce_club
  BEFORE INSERT OR UPDATE OF item_id, club_id ON public.inventory_damages
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
CREATE TRIGGER inventory_stocktake_lines_enforce_club
  BEFORE INSERT OR UPDATE OF stocktake_id, item_id, club_id ON public.inventory_stocktake_lines
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
CREATE TRIGGER inventory_purchase_order_lines_enforce_club
  BEFORE INSERT OR UPDATE OF order_id, item_id, club_id ON public.inventory_purchase_order_lines
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
CREATE POLICY "inventory_categories_select" ON public.inventory_categories FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));

-- Zwroty zawodnika: tylko powiązane z jego wydaniami
DROP POLICY IF EXISTS "inventory_returns_select" ON public.inventory_returns;
CREATE POLICY "inventory_returns_select" ON public.inventory_returns FOR SELECT TO authenticated
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
CREATE POLICY "inventory_reports_select" ON public.inventory_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_inventory(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );

-- Naprawa błędnych stanów z seeda (uszkodzenia na wydanych pozycjach)
UPDATE public.inventory_items i
SET
  quantity_issued = GREATEST(i.quantity_issued - 1, 0),
  quantity_damaged = i.quantity_damaged + 1
WHERE i.club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
  AND i.inventory_number IN ('PIORUN-MAG-0001','PIORUN-MAG-0002','PIORUN-MAG-0003','PIORUN-MAG-0004','PIORUN-MAG-0005')
  AND i.quantity_damaged >= 1
  AND i.quantity_issued >= 1
  AND (i.quantity_available + i.quantity_issued + i.quantity_damaged) > i.quantity_total;

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
SELECT public.refresh_inventory_item_status(id)
FROM public.inventory_items
WHERE club_id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
