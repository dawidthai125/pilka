-- ETAP 15.9: Equipment & Assets Management

CREATE TYPE public.asset_condition AS ENUM (
  'new',
  'good',
  'needs_repair',
  'damaged',
  'retired'
);

CREATE TYPE public.asset_maintenance_type AS ENUM (
  'repair',
  'inspection',
  'replacement'
);

CREATE TYPE public.asset_maintenance_status AS ENUM (
  'reported',
  'in_progress',
  'completed'
);

CREATE TYPE public.asset_assignee_kind AS ENUM (
  'coach',
  'player',
  'staff',
  'team_manager'
);

CREATE TYPE public.equipment_kit_type AS ENUM (
  'match_kit',
  'training_kit',
  'tracksuit'
);

ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'asset_return_overdue';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'asset_damaged';
ALTER TYPE public.notification_event_type ADD VALUE IF NOT EXISTS 'asset_maintenance_due';

CREATE TABLE public.asset_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT asset_categories_club_slug_unique UNIQUE (club_id, slug)
);

CREATE INDEX asset_categories_club_idx ON public.asset_categories (club_id, sort_order);

CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.asset_categories (id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  inventory_number TEXT,
  description TEXT,
  purchase_date DATE,
  purchase_value NUMERIC(12, 2) CHECK (purchase_value IS NULL OR purchase_value >= 0),
  condition public.asset_condition NOT NULL DEFAULT 'good',
  location TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  quantity_available INT NOT NULL DEFAULT 1 CHECK (quantity_available >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT equipment_assets_qty_available_check CHECK (quantity_available <= quantity)
);

CREATE INDEX assets_club_category_idx ON public.assets (club_id, category_id, is_active);
CREATE INDEX assets_club_condition_idx ON public.assets (club_id, condition) WHERE is_active = TRUE;
CREATE INDEX assets_club_location_idx ON public.assets (club_id, location) WHERE location IS NOT NULL;
CREATE UNIQUE INDEX assets_club_inventory_unique ON public.assets (club_id, inventory_number)
  WHERE inventory_number IS NOT NULL AND inventory_number <> '';

CREATE TABLE public.asset_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  assignee_kind public.asset_assignee_kind NOT NULL,
  profile_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  player_id UUID REFERENCES public.players (id) ON DELETE SET NULL,
  assignee_label TEXT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  due_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,
  notes TEXT,
  issued_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  returned_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT asset_assignments_target_check CHECK (
    profile_id IS NOT NULL OR player_id IS NOT NULL OR assignee_label IS NOT NULL
  )
);

CREATE INDEX asset_assignments_club_open_idx ON public.asset_assignments (club_id, returned_at)
  WHERE returned_at IS NULL;
CREATE INDEX asset_assignments_asset_idx ON public.asset_assignments (asset_id, issued_at DESC);
CREATE INDEX asset_assignments_player_idx ON public.asset_assignments (club_id, player_id)
  WHERE player_id IS NOT NULL;

CREATE TABLE public.asset_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  asset_id UUID NOT NULL REFERENCES public.assets (id) ON DELETE CASCADE,
  maintenance_type public.asset_maintenance_type NOT NULL,
  status public.asset_maintenance_status NOT NULL DEFAULT 'reported',
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at DATE,
  completed_at TIMESTAMPTZ,
  cost NUMERIC(12, 2) CHECK (cost IS NULL OR cost >= 0),
  reported_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX asset_maintenance_club_status_idx ON public.asset_maintenance (club_id, status);
CREATE INDEX asset_maintenance_scheduled_idx ON public.asset_maintenance (club_id, scheduled_at)
  WHERE status <> 'completed';

CREATE TABLE public.equipment_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  kit_type public.equipment_kit_type NOT NULL,
  jersey_number INT CHECK (jersey_number IS NULL OR (jersey_number >= 1 AND jersey_number <= 99)),
  size TEXT NOT NULL,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX equipment_kits_club_player_idx ON public.equipment_kits (club_id, player_id, is_active);
CREATE UNIQUE INDEX equipment_kits_active_unique ON public.equipment_kits (club_id, player_id, kit_type)
  WHERE is_active = TRUE;

CREATE TABLE public.equipment_kit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES public.clubs (id) ON DELETE CASCADE,
  kit_id UUID NOT NULL REFERENCES public.equipment_kits (id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players (id) ON DELETE CASCADE,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX equipment_kit_history_kit_idx ON public.equipment_kit_history (kit_id, changed_at DESC);

CREATE TRIGGER assets_set_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER asset_assignments_set_updated_at
  BEFORE UPDATE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER asset_maintenance_set_updated_at
  BEFORE UPDATE ON public.asset_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER equipment_kits_set_updated_at
  BEFORE UPDATE ON public.equipment_kits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RBAC helpers
CREATE OR REPLACE FUNCTION public.actor_can_manage_equipment(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['owner', 'president', 'sports_director']::public.club_role[]
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_issue_equipment(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_equipment(p_club_id)
      OR public.user_has_club_role(p_club_id, ARRAY['coach']::public.club_role[])
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_equipment_staff(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.actor_can_issue_equipment(p_club_id);
$$;

CREATE OR REPLACE FUNCTION public.actor_can_read_equipment_assignment(p_club_id UUID, p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(p_club_id)
      OR p_player_id IN (SELECT public.actor_managed_player_ids(p_club_id))
    );
$$;

CREATE OR REPLACE FUNCTION public.actor_can_access_equipment_portal(p_club_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    p_club_id IN (SELECT public.user_club_ids())
    AND public.user_has_club_role(
      p_club_id,
      ARRAY['player', 'parent']::public.club_role[]
    );
$$;

ALTER TABLE public.asset_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_maintenance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_kit_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY asset_categories_select ON public.asset_categories FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR public.actor_can_access_equipment_portal(club_id)
    )
  );

CREATE POLICY asset_categories_manage ON public.asset_categories FOR ALL TO authenticated
  USING (public.actor_can_manage_equipment(club_id))
  WITH CHECK (public.actor_can_manage_equipment(club_id));

CREATE POLICY assets_select ON public.assets FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR (
        public.actor_can_access_equipment_portal(club_id)
        AND EXISTS (
          SELECT 1 FROM public.asset_assignments aa
          WHERE aa.asset_id = id
            AND aa.returned_at IS NULL
            AND aa.player_id IN (SELECT public.actor_managed_player_ids(club_id))
        )
      )
    )
  );

CREATE POLICY assets_manage ON public.assets FOR ALL TO authenticated
  USING (public.actor_can_manage_equipment(club_id))
  WITH CHECK (public.actor_can_manage_equipment(club_id));

CREATE POLICY asset_assignments_select ON public.asset_assignments FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR (
        player_id IS NOT NULL
        AND public.actor_can_read_equipment_assignment(club_id, player_id)
      )
      OR profile_id = auth.uid()
    )
  );

CREATE POLICY asset_assignments_insert ON public.asset_assignments FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_assignments_update ON public.asset_assignments FOR UPDATE TO authenticated
  USING (public.actor_can_issue_equipment(club_id))
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_assignments_delete ON public.asset_assignments FOR DELETE TO authenticated
  USING (public.actor_can_manage_equipment(club_id));

CREATE POLICY asset_maintenance_select ON public.asset_maintenance FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND public.actor_can_read_equipment_staff(club_id)
  );

CREATE POLICY asset_maintenance_insert ON public.asset_maintenance FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_maintenance_update ON public.asset_maintenance FOR UPDATE TO authenticated
  USING (
    public.actor_can_manage_equipment(club_id)
    OR (
      public.actor_can_issue_equipment(club_id)
      AND status = 'reported'
      AND reported_by = auth.uid()
    )
  )
  WITH CHECK (public.actor_can_issue_equipment(club_id));

CREATE POLICY asset_maintenance_delete ON public.asset_maintenance FOR DELETE TO authenticated
  USING (public.actor_can_manage_equipment(club_id));

CREATE POLICY equipment_kits_select ON public.equipment_kits FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR public.actor_can_read_equipment_assignment(club_id, player_id)
    )
  );

CREATE POLICY equipment_kits_manage ON public.equipment_kits FOR ALL TO authenticated
  USING (public.actor_can_manage_equipment(club_id))
  WITH CHECK (public.actor_can_manage_equipment(club_id));

CREATE POLICY equipment_kit_history_select ON public.equipment_kit_history FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_read_equipment_staff(club_id)
      OR public.actor_can_read_equipment_assignment(club_id, player_id)
    )
  );

CREATE POLICY equipment_kit_history_insert ON public.equipment_kit_history FOR INSERT TO authenticated
  WITH CHECK (public.actor_can_manage_equipment(club_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_assignments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_maintenance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipment_kits TO authenticated;
GRANT SELECT, INSERT ON public.equipment_kit_history TO authenticated;

GRANT EXECUTE ON FUNCTION public.actor_can_manage_equipment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_issue_equipment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_equipment_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_read_equipment_assignment(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.actor_can_access_equipment_portal(UUID) TO authenticated;
