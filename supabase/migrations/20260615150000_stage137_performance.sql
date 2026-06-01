-- ETAP 13.7 — consolidate hot-path queries into single RPC round-trips

-- Layout: profiles + memberships + club + teams + unread count + website_settings
CREATE OR REPLACE FUNCTION public.get_app_layout_context(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_now TIMESTAMPTZ := NOW();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.club_memberships
    WHERE user_id = v_user_id AND club_id = p_club_id AND status = 'active'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'profile', (
      SELECT to_jsonb(p) - 'created_at' - 'updated_at'
      FROM (
        SELECT id, email, full_name, avatar_url, phone, locale
        FROM public.profiles
        WHERE id = v_user_id
      ) p
    ),
    'memberships', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', cm.id,
          'club_id', cm.club_id,
          'user_id', cm.user_id,
          'role', cm.role,
          'status', cm.status,
          'team_id', cm.team_id
        )
        ORDER BY cm.role
      )
      FROM public.club_memberships cm
      WHERE cm.user_id = v_user_id
        AND cm.club_id = p_club_id
        AND cm.status = 'active'
    ), '[]'::jsonb),
    'club', (
      SELECT to_jsonb(c)
      FROM (
        SELECT id, slug, public_name, official_name, association, competition_level, country, voivodeship, status
        FROM public.clubs
        WHERE id = p_club_id
      ) c
    ),
    'teams', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', t.id,
          'club_id', t.club_id,
          'name', t.name,
          'category', t.category,
          'season', t.season,
          'is_active', t.is_active
        )
        ORDER BY t.name
      )
      FROM public.teams t
      WHERE t.club_id = p_club_id
    ), '[]'::jsonb),
    'unread_notifications', COALESCE((
      SELECT COUNT(*)::INTEGER
      FROM public.club_notifications cn
      WHERE cn.club_id = p_club_id
        AND cn.user_id = v_user_id
        AND cn.read_at IS NULL
        AND cn.scheduled_at <= v_now
    ), 0),
    'website_settings', (
      SELECT jsonb_build_object(
        'club_id', ws.club_id,
        'primary_color', ws.primary_color,
        'secondary_color', ws.secondary_color,
        'public_site_enabled', ws.public_site_enabled,
        'accent_color', ws.accent_color
      )
      FROM public.website_settings ws
      WHERE ws.club_id = p_club_id
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_app_layout_context(UUID) TO authenticated;

-- Dashboard home: player counts + document alerts in one call
CREATE OR REPLACE FUNCTION public.get_home_dashboard_stats(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_horizon DATE := CURRENT_DATE + 30;
BEGIN
  IF NOT public.actor_can_read_players(p_club_id) THEN
    RETURN jsonb_build_object(
      'player_counts', jsonb_build_object('total', 0, 'active', 0),
      'document_alerts', '[]'::jsonb
    );
  END IF;

  RETURN jsonb_build_object(
    'player_counts', jsonb_build_object(
      'total', (SELECT COUNT(*)::INTEGER FROM public.players WHERE club_id = p_club_id),
      'active', (
        SELECT COUNT(*)::INTEGER FROM public.players
        WHERE club_id = p_club_id AND status = 'active'
      )
    ),
    'document_alerts', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'document_id', d.id,
          'player_id', d.player_id,
          'player_name', p.first_name || ' ' || p.last_name,
          'document_title', d.title,
          'document_type', d.document_type,
          'expires_at', d.expires_at
        )
        ORDER BY d.expires_at
      )
      FROM public.player_documents d
      JOIN public.players p ON p.id = d.player_id AND p.club_id = p_club_id
      WHERE d.club_id = p_club_id
        AND d.expires_at IS NOT NULL
        AND d.expires_at <= v_horizon
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_home_dashboard_stats(UUID) TO authenticated;

-- Sponsors dashboard stats (5 queries → 1)
CREATE OR REPLACE FUNCTION public.get_sponsor_dashboard_stats(p_club_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total_sponsors', (
      SELECT COUNT(*)::INTEGER FROM public.sponsors WHERE club_id = p_club_id
    ),
    'active_contracts', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_contracts
      WHERE club_id = p_club_id AND status = 'active'
    ),
    'expiring_contracts', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_contracts
      WHERE club_id = p_club_id AND status = 'expiring'
    ),
    'active_contract_value', COALESCE((
      SELECT SUM(value) FROM public.sponsor_contracts
      WHERE club_id = p_club_id AND status IN ('active', 'expiring')
    ), 0),
    'open_leads', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_leads
      WHERE club_id = p_club_id AND status NOT IN ('won', 'rejected')
    ),
    'publications_this_month', (
      SELECT COUNT(*)::INTEGER FROM public.sponsor_publications
      WHERE club_id = p_club_id
        AND published_at >= date_trunc('month', CURRENT_DATE)
    )
  )
  WHERE public.actor_can_read_sponsors(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_dashboard_stats(UUID) TO authenticated;

-- Finance dashboard page bundle
CREATE OR REPLACE FUNCTION public.get_finance_dashboard_page(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_totals JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.club_memberships cm
    WHERE cm.user_id = auth.uid()
      AND cm.club_id = p_club_id
      AND cm.status = 'active'
      AND cm.role::text IN ('owner', 'president', 'sports_director')
  ) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'total_income', COALESCE((SELECT SUM(amount) FROM public.finance_income WHERE club_id = p_club_id), 0),
    'total_expenses', COALESCE((SELECT SUM(amount) FROM public.finance_expenses WHERE club_id = p_club_id), 0),
    'sponsor_income', COALESCE((
      SELECT SUM(amount) FROM public.finance_income
      WHERE club_id = p_club_id AND category = 'sponsors'
    ), 0),
    'total_fees_due', COALESCE((SELECT SUM(amount_due) FROM public.finance_player_fees WHERE club_id = p_club_id), 0),
    'total_fees_paid', COALESCE((SELECT SUM(amount_paid) FROM public.finance_player_fees WHERE club_id = p_club_id), 0),
    'overdue_fees_count', COALESCE((
      SELECT COUNT(*)::INTEGER FROM public.finance_player_fees
      WHERE club_id = p_club_id AND amount_paid < amount_due AND due_date < CURRENT_DATE
    ), 0)
  ) INTO v_totals;

  RETURN jsonb_build_object(
    'totals', v_totals,
    'overdue_fees', COALESCE((
      SELECT jsonb_agg(row_to_json(f)::jsonb ORDER BY f.due_date)
      FROM (
        SELECT
          fpf.id,
          fpf.player_id,
          fpf.name,
          fpf.amount_due,
          fpf.amount_paid,
          fpf.due_date,
          fpf.status,
          p.first_name,
          p.last_name
        FROM public.finance_player_fees fpf
        LEFT JOIN public.players p ON p.id = fpf.player_id
        WHERE fpf.club_id = p_club_id
          AND fpf.status IN ('partial', 'overdue')
          AND fpf.due_date < CURRENT_DATE
        ORDER BY fpf.due_date
        LIMIT 20
      ) f
    ), '[]'::jsonb),
    'recent_income', COALESCE((
      SELECT jsonb_agg(row_to_json(i)::jsonb ORDER BY i.transaction_date DESC)
      FROM (
        SELECT fi.id, fi.amount, fi.transaction_date, fi.description, fi.category, fi.created_by
        FROM public.finance_income fi
        WHERE fi.club_id = p_club_id
        ORDER BY fi.transaction_date DESC
        LIMIT 5
      ) i
    ), '[]'::jsonb),
    'recent_expenses', COALESCE((
      SELECT jsonb_agg(row_to_json(e)::jsonb ORDER BY e.transaction_date DESC)
      FROM (
        SELECT fe.id, fe.amount, fe.transaction_date, fe.description, fe.category, fe.created_by
        FROM public.finance_expenses fe
        WHERE fe.club_id = p_club_id
        ORDER BY fe.transaction_date DESC
        LIMIT 5
      ) e
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_finance_dashboard_page(UUID) TO authenticated;

-- AI manager snapshot: memory + pending approvals
CREATE OR REPLACE FUNCTION public.get_ai_manager_snapshot(p_club_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN jsonb_build_object(
    'memory_summary', COALESCE((
      SELECT am.summary
      FROM public.ai_memory am
      WHERE am.club_id = p_club_id
        AND am.user_id = v_user_id
        AND am.conversation_id IS NULL
      ORDER BY am.updated_at DESC
      LIMIT 1
    ), ''),
    'pending_approvals', COALESCE((
      SELECT jsonb_agg(to_jsonb(a) ORDER BY a.created_at DESC)
      FROM (
        SELECT id, club_id, user_id, task_id, tool_call_id, risk_level, status, preview, created_at
        FROM public.ai_action_approvals
        WHERE club_id = p_club_id
          AND user_id = v_user_id
          AND status = 'pending'
        ORDER BY created_at DESC
      ) a
    ), '[]'::jsonb)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_ai_manager_snapshot(UUID) TO authenticated;
