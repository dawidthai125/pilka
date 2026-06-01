-- ETAP 15.9 audit hardening — scope triggers + indexes

CREATE OR REPLACE FUNCTION public.enforce_asset_assignment_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_club UUID;
BEGIN
  SELECT club_id INTO v_asset_club FROM public.assets WHERE id = NEW.asset_id;
  IF v_asset_club IS NULL OR v_asset_club <> NEW.club_id THEN
    RAISE EXCEPTION 'asset_id must belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_assignments_club_scope
  BEFORE INSERT OR UPDATE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_asset_assignment_club_scope();

CREATE OR REPLACE FUNCTION public.enforce_asset_maintenance_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_asset_club UUID;
BEGIN
  SELECT club_id INTO v_asset_club FROM public.assets WHERE id = NEW.asset_id;
  IF v_asset_club IS NULL OR v_asset_club <> NEW.club_id THEN
    RAISE EXCEPTION 'asset_id must belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER asset_maintenance_club_scope
  BEFORE INSERT OR UPDATE ON public.asset_maintenance
  FOR EACH ROW EXECUTE FUNCTION public.enforce_asset_maintenance_club_scope();

CREATE OR REPLACE FUNCTION public.enforce_equipment_kit_club_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_player_club UUID;
BEGIN
  SELECT club_id INTO v_player_club FROM public.players WHERE id = NEW.player_id;
  IF v_player_club IS NULL OR v_player_club <> NEW.club_id THEN
    RAISE EXCEPTION 'player_id must belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipment_kits_club_scope
  BEFORE INSERT OR UPDATE ON public.equipment_kits
  FOR EACH ROW EXECUTE FUNCTION public.enforce_equipment_kit_club_scope();

CREATE OR REPLACE FUNCTION public.log_equipment_kit_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF OLD.jersey_number IS DISTINCT FROM NEW.jersey_number THEN
      INSERT INTO public.equipment_kit_history (
        club_id, kit_id, player_id, field_changed, old_value, new_value, changed_by
      ) VALUES (
        NEW.club_id, NEW.id, NEW.player_id, 'jersey_number',
        OLD.jersey_number::text, NEW.jersey_number::text, auth.uid()
      );
    END IF;
    IF OLD.size IS DISTINCT FROM NEW.size THEN
      INSERT INTO public.equipment_kit_history (
        club_id, kit_id, player_id, field_changed, old_value, new_value, changed_by
      ) VALUES (
        NEW.club_id, NEW.id, NEW.player_id, 'size', OLD.size, NEW.size, auth.uid()
      );
    END IF;
    IF OLD.kit_type IS DISTINCT FROM NEW.kit_type THEN
      INSERT INTO public.equipment_kit_history (
        club_id, kit_id, player_id, field_changed, old_value, new_value, changed_by
      ) VALUES (
        NEW.club_id, NEW.id, NEW.player_id, 'kit_type', OLD.kit_type::text, NEW.kit_type::text, auth.uid()
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER equipment_kits_history_log
  AFTER UPDATE ON public.equipment_kits
  FOR EACH ROW EXECUTE FUNCTION public.log_equipment_kit_change();

CREATE INDEX IF NOT EXISTS assets_club_active_idx ON public.assets (club_id, is_active, updated_at DESC);
CREATE INDEX IF NOT EXISTS asset_assignments_due_idx ON public.asset_assignments (club_id, due_at)
  WHERE returned_at IS NULL AND due_at IS NOT NULL;
