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
