-- ETAP 8: Moduł magazynowy klubu

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

CREATE TYPE public.inventory_item_status AS ENUM (
  'available',
  'issued',
  'damaged',
  'retired'
);

CREATE TYPE public.inventory_recipient_type AS ENUM (
  'player',
  'coach',
  'team_manager'
);

CREATE TYPE public.inventory_return_condition AS ENUM (
  'functional',
  'damaged',
  'lost'
);

CREATE TYPE public.inventory_damage_status AS ENUM (
  'reported',
  'in_repair',
  'repaired',
  'replacement_needed'
);

CREATE TYPE public.inventory_order_status AS ENUM (
  'draft',
  'ordered',
  'in_progress',
  'delivered',
  'cancelled'
);

CREATE TYPE public.inventory_stocktake_type AS ENUM (
  'partial',
  'full'
);

CREATE TYPE public.inventory_stocktake_status AS ENUM (
  'in_progress',
  'completed'
);

CREATE TYPE public.inventory_report_type AS ENUM (
  'stock_status',
  'issued_equipment',
  'damaged_equipment',
  'issue_history'
);

CREATE TYPE public.inventory_report_status AS ENUM (
  'draft',
  'published'
);

ALTER TYPE public.ai_report_category ADD VALUE IF NOT EXISTS 'inventory';

-- ---------------------------------------------------------------------------
-- Kategorie (słownik per klub)
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug public.inventory_item_category NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE (club_id, slug)
);

CREATE INDEX idx_inventory_categories_club ON public.inventory_categories (club_id, sort_order);

-- ---------------------------------------------------------------------------
-- Dostawcy
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_suppliers (
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

CREATE INDEX idx_inventory_suppliers_club ON public.inventory_suppliers (club_id, name);

-- ---------------------------------------------------------------------------
-- Kartoteka sprzętu
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_items (
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

CREATE INDEX idx_inventory_items_club_category ON public.inventory_items (club_id, category_id);
CREATE INDEX idx_inventory_items_club_status ON public.inventory_items (club_id, status);
CREATE INDEX idx_inventory_items_low_stock ON public.inventory_items (club_id)
  WHERE quantity_available <= min_stock_level AND min_stock_level > 0;

-- ---------------------------------------------------------------------------
-- Wydania sprzętu
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_transactions (
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

CREATE INDEX idx_inventory_transactions_club_date ON public.inventory_transactions (club_id, issue_date DESC);
CREATE INDEX idx_inventory_transactions_item ON public.inventory_transactions (item_id, issue_date DESC);
CREATE INDEX idx_inventory_transactions_player ON public.inventory_transactions (club_id, player_id);

-- ---------------------------------------------------------------------------
-- Zwroty
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_returns (
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

CREATE INDEX idx_inventory_returns_club_date ON public.inventory_returns (club_id, return_date DESC);
CREATE INDEX idx_inventory_returns_item ON public.inventory_returns (item_id);

-- ---------------------------------------------------------------------------
-- Uszkodzenia
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_damages (
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

CREATE INDEX idx_inventory_damages_club_status ON public.inventory_damages (club_id, status);

-- ---------------------------------------------------------------------------
-- Stroje zawodników
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_player_kits (
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

CREATE TABLE public.inventory_kit_assignments (
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

CREATE INDEX idx_inventory_kit_assignments_player ON public.inventory_kit_assignments (club_id, player_id, assigned_date DESC);

-- ---------------------------------------------------------------------------
-- Inwentaryzacja
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_stocktakes (
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

CREATE TABLE public.inventory_stocktake_lines (
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

CREATE INDEX idx_inventory_stocktakes_club ON public.inventory_stocktakes (club_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- Zamówienia
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_purchase_orders (
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

CREATE TABLE public.inventory_purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.inventory_purchase_orders (id) ON DELETE CASCADE,
  item_id UUID REFERENCES public.inventory_items (id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) CHECK (unit_price IS NULL OR unit_price >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX idx_inventory_orders_club_status ON public.inventory_purchase_orders (club_id, status);

-- ---------------------------------------------------------------------------
-- Raporty magazynowe
-- ---------------------------------------------------------------------------

CREATE TABLE public.inventory_reports (
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

CREATE INDEX idx_inventory_reports_club ON public.inventory_reports (club_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Triggery updated_at
-- ---------------------------------------------------------------------------

CREATE TRIGGER inventory_suppliers_set_updated_at
  BEFORE UPDATE ON public.inventory_suppliers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_items_set_updated_at
  BEFORE UPDATE ON public.inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_damages_set_updated_at
  BEFORE UPDATE ON public.inventory_damages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_player_kits_set_updated_at
  BEFORE UPDATE ON public.inventory_player_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_stocktakes_set_updated_at
  BEFORE UPDATE ON public.inventory_stocktakes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_purchase_orders_set_updated_at
  BEFORE UPDATE ON public.inventory_purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER inventory_reports_set_updated_at
  BEFORE UPDATE ON public.inventory_reports
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

CREATE TRIGGER inventory_items_enforce_club
  BEFORE INSERT OR UPDATE OF category_id, supplier_id, club_id ON public.inventory_items
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

CREATE TRIGGER inventory_transactions_enforce_club
  BEFORE INSERT OR UPDATE OF item_id, player_id, club_id ON public.inventory_transactions
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

CREATE TRIGGER inventory_returns_enforce_club
  BEFORE INSERT OR UPDATE OF item_id, club_id ON public.inventory_returns
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
    UPDATE public.inventory_items SET status = 'retired' WHERE id = p_item_id;
  ELSIF v.quantity_damaged > 0 AND v.quantity_available = 0 AND v.quantity_issued = 0 THEN
    UPDATE public.inventory_items SET status = 'damaged' WHERE id = p_item_id;
  ELSIF v.quantity_issued > 0 AND v.quantity_available = 0 THEN
    UPDATE public.inventory_items SET status = 'issued' WHERE id = p_item_id;
  ELSIF v.quantity_available > 0 THEN
    UPDATE public.inventory_items SET status = 'available' WHERE id = p_item_id;
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

  UPDATE public.inventory_items
  SET
    quantity_available = quantity_available - NEW.quantity,
    quantity_issued = quantity_issued + NEW.quantity
  WHERE id = NEW.item_id;

  PERFORM public.refresh_inventory_item_status(NEW.item_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_transactions_apply_issue
  AFTER INSERT ON public.inventory_transactions
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
    UPDATE public.inventory_items
    SET
      quantity_issued = quantity_issued - NEW.quantity,
      quantity_available = quantity_available + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.condition = 'damaged' THEN
    UPDATE public.inventory_items
    SET
      quantity_issued = quantity_issued - NEW.quantity,
      quantity_damaged = quantity_damaged + NEW.quantity
    WHERE id = NEW.item_id;
  ELSIF NEW.condition = 'lost' THEN
    UPDATE public.inventory_items
    SET
      quantity_issued = quantity_issued - NEW.quantity,
      quantity_total = quantity_total - NEW.quantity
    WHERE id = NEW.item_id;
  END IF;

  PERFORM public.refresh_inventory_item_status(NEW.item_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER inventory_returns_apply_return
  AFTER INSERT ON public.inventory_returns
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

CREATE POLICY "inventory_categories_select" ON public.inventory_categories FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id) OR public.player_id_for_user(club_id, auth.uid()) IS NOT NULL);
CREATE POLICY "inventory_categories_manage" ON public.inventory_categories FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_suppliers_select" ON public.inventory_suppliers FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_suppliers_manage" ON public.inventory_suppliers FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_items_select" ON public.inventory_items FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_items_manage" ON public.inventory_items FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_transactions_select" ON public.inventory_transactions FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR player_id = public.player_id_for_user(club_id, auth.uid())
  );
CREATE POLICY "inventory_transactions_insert" ON public.inventory_transactions FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_inventory(club_id));
CREATE POLICY "inventory_transactions_manage" ON public.inventory_transactions FOR UPDATE TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));
CREATE POLICY "inventory_transactions_delete" ON public.inventory_transactions FOR DELETE TO authenticated
  USING (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_returns_select" ON public.inventory_returns FOR SELECT TO authenticated
  USING (
    public.actor_can_read_inventory(club_id)
    OR EXISTS (
      SELECT 1 FROM public.inventory_transactions t
      WHERE t.id = transaction_id
        AND t.player_id = public.player_id_for_user(club_id, auth.uid())
    )
  );
CREATE POLICY "inventory_returns_insert" ON public.inventory_returns FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_inventory(club_id));
CREATE POLICY "inventory_returns_manage" ON public.inventory_returns FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_damages_select" ON public.inventory_damages FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_damages_manage" ON public.inventory_damages FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_player_kits_select" ON public.inventory_player_kits FOR SELECT TO authenticated
  USING (public.actor_can_read_own_inventory(club_id, player_id));
CREATE POLICY "inventory_player_kits_manage" ON public.inventory_player_kits FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_kit_assignments_select" ON public.inventory_kit_assignments FOR SELECT TO authenticated
  USING (public.actor_can_read_own_inventory(club_id, player_id));
CREATE POLICY "inventory_kit_assignments_manage" ON public.inventory_kit_assignments FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_stocktakes_select" ON public.inventory_stocktakes FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_stocktakes_manage" ON public.inventory_stocktakes FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_stocktake_lines_select" ON public.inventory_stocktake_lines FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_stocktake_lines_manage" ON public.inventory_stocktake_lines FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_purchase_orders_select" ON public.inventory_purchase_orders FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_purchase_orders_manage" ON public.inventory_purchase_orders FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_purchase_order_lines_select" ON public.inventory_purchase_order_lines FOR SELECT TO authenticated
  USING (public.actor_can_read_inventory(club_id));
CREATE POLICY "inventory_purchase_order_lines_manage" ON public.inventory_purchase_order_lines FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

CREATE POLICY "inventory_reports_select" ON public.inventory_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_manage_inventory(club_id)
    OR (
      public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
      AND club_id IN (SELECT public.user_club_ids())
      AND status = 'published'
    )
  );
CREATE POLICY "inventory_reports_manage" ON public.inventory_reports FOR ALL TO authenticated
  USING (public.actor_can_manage_inventory(club_id))
  WITH CHECK (public.actor_can_manage_inventory(club_id));

-- Storage: zdjęcia magazynowe
CREATE POLICY "club_assets_inventory_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.storage_club_id_from_path(name) IN (SELECT public.user_club_ids())
    AND public.actor_can_read_inventory(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_inventory_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.actor_can_manage_inventory(public.storage_club_id_from_path(name))
  );

CREATE POLICY "club_assets_inventory_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'club-assets'
    AND split_part(name, '/', 2) = 'inventory'
    AND public.actor_can_manage_inventory(public.storage_club_id_from_path(name))
  );

-- AI category
INSERT INTO public.ai_report_categories (id, name, description, sort_order)
VALUES ('inventory', 'Magazyn', 'Raporty stanu magazynu, wydań i uszkodzeń', 70)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

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
