-- ETAP 15.9 — fix partial apply / rename constraint if needed

DO $$
BEGIN
  IF to_regclass('public.assets') IS NOT NULL THEN
    ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS assets_quantity_available_check;
    ALTER TABLE public.assets DROP CONSTRAINT IF EXISTS equipment_assets_qty_available_check;
    ALTER TABLE public.assets
      ADD CONSTRAINT equipment_assets_qty_available_check
      CHECK (quantity_available <= quantity);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Re-apply assets_select if portal leak fix needed
DROP POLICY IF EXISTS assets_select ON public.assets;
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
