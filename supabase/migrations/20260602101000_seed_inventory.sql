-- ETAP 8: Seed danych magazynowych — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_team_id UUID := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  v_coach_id UUID;
  v_director_id UUID;
  v_player_id UUID;
  v_item_id UUID;
  v_ball_id UUID;
  v_kit_id UUID;
  v_supplier_sport UUID := 'd8010001-0000-4000-8000-000000000001';
  v_supplier_nike UUID := 'd8010001-0000-4000-8000-000000000002';
  v_supplier_med UUID := 'd8010001-0000-4000-8000-000000000003';
  v_supplier_ele UUID := 'd8010001-0000-4000-8000-000000000004';
  v_supplier_local UUID := 'd8010001-0000-4000-8000-000000000005';
  v_cat_match UUID;
  v_cat_training UUID;
  v_cat_tracksuit UUID;
  v_cat_balls UUID;
  v_cat_markers UUID;
  v_cat_cones UUID;
  v_cat_goals UUID;
  v_cat_medical UUID;
  v_cat_strength UUID;
  v_cat_pitch UUID;
  v_cat_electronics UUID;
  v_cat_other UUID;
  v_i INTEGER;
  v_tx UUID;
  v_sizes TEXT[] := ARRAY['XS','S','M','L','XL','XXL'];
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;
  SELECT id INTO v_director_id FROM public.profiles WHERE email = 'dyrektor@piorun.test' LIMIT 1;
  IF v_director_id IS NULL THEN
    SELECT id INTO v_director_id FROM public.profiles WHERE email = 'prezes@piorun.test' LIMIT 1;
  END IF;

  DELETE FROM public.inventory_stocktake_lines WHERE club_id = v_club_id;
  DELETE FROM public.inventory_stocktakes WHERE club_id = v_club_id;
  DELETE FROM public.inventory_purchase_order_lines WHERE club_id = v_club_id;
  DELETE FROM public.inventory_purchase_orders WHERE club_id = v_club_id;
  DELETE FROM public.inventory_reports WHERE club_id = v_club_id;
  DELETE FROM public.inventory_returns WHERE club_id = v_club_id;
  DELETE FROM public.inventory_kit_assignments WHERE club_id = v_club_id;
  DELETE FROM public.inventory_transactions WHERE club_id = v_club_id;
  DELETE FROM public.inventory_damages WHERE club_id = v_club_id;
  DELETE FROM public.inventory_player_kits WHERE club_id = v_club_id;
  DELETE FROM public.inventory_items WHERE club_id = v_club_id;
  DELETE FROM public.inventory_suppliers WHERE club_id = v_club_id;
  DELETE FROM public.inventory_categories WHERE club_id = v_club_id;

  INSERT INTO public.inventory_categories (id, club_id, slug, name, sort_order) VALUES
    ('d8020001-0000-4000-8000-000000000001', v_club_id, 'match_kit', 'Stroje meczowe', 1),
    ('d8020001-0000-4000-8000-000000000002', v_club_id, 'training_kit', 'Stroje treningowe', 2),
    ('d8020001-0000-4000-8000-000000000003', v_club_id, 'tracksuit', 'Dresy', 3),
    ('d8020001-0000-4000-8000-000000000004', v_club_id, 'balls', 'Piłki', 4),
    ('d8020001-0000-4000-8000-000000000005', v_club_id, 'markers', 'Znaczniki', 5),
    ('d8020001-0000-4000-8000-000000000006', v_club_id, 'cones', 'Pachołki', 6),
    ('d8020001-0000-4000-8000-000000000007', v_club_id, 'training_goals', 'Bramki treningowe', 7),
    ('d8020001-0000-4000-8000-000000000008', v_club_id, 'medical', 'Sprzęt medyczny', 8),
    ('d8020001-0000-4000-8000-000000000009', v_club_id, 'strength', 'Sprzęt siłowy', 9),
    ('d8020001-0000-4000-8000-000000000010', v_club_id, 'pitch', 'Sprzęt boiskowy', 10),
    ('d8020001-0000-4000-8000-000000000011', v_club_id, 'electronics', 'Elektronika', 11),
    ('d8020001-0000-4000-8000-000000000012', v_club_id, 'other', 'Inne', 12);

  SELECT id INTO v_cat_match FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'match_kit';
  SELECT id INTO v_cat_training FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'training_kit';
  SELECT id INTO v_cat_tracksuit FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'tracksuit';
  SELECT id INTO v_cat_balls FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'balls';
  SELECT id INTO v_cat_markers FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'markers';
  SELECT id INTO v_cat_cones FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'cones';
  SELECT id INTO v_cat_goals FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'training_goals';
  SELECT id INTO v_cat_medical FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'medical';
  SELECT id INTO v_cat_strength FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'strength';
  SELECT id INTO v_cat_pitch FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'pitch';
  SELECT id INTO v_cat_electronics FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'electronics';
  SELECT id INTO v_cat_other FROM public.inventory_categories WHERE club_id = v_club_id AND slug = 'other';

  INSERT INTO public.inventory_suppliers (id, club_id, name, contact_name, phone, email, address) VALUES
    (v_supplier_sport, v_club_id, 'SportMax Polska', 'Jan Kowalski', '+48 501 100 200', 'jan@sportmax.pl', 'ul. Sportowa 12, Wrocław'),
    (v_supplier_nike, v_club_id, 'Nike Team Sales', 'Anna Nowak', '+48 502 200 300', 'anna@nike-team.pl', 'ul. Handlowa 5, Poznań'),
    (v_supplier_med, v_club_id, 'MedSport', 'Piotr Wiśniewski', '+48 503 300 400', 'kontakt@medsport.pl', 'ul. Zdrowia 8, Wrocław'),
    (v_supplier_ele, v_club_id, 'ElektroArena', 'Maria Zielińska', '+48 504 400 500', 'biuro@elektroarena.pl', 'ul. Elektryczna 3, Opole'),
    (v_supplier_local, v_club_id, 'Sklep Klubowy Piorun', 'Tomasz Lewandowski', '+48 505 500 600', 'sklep@piorun.test', 'Wawrzeńczyce, boisko główne');

  -- 100 pozycji magazynowych
  INSERT INTO public.inventory_items (
    id, club_id, category_id, name, inventory_number, internal_code,
    description, purchase_date, purchase_price, supplier_id,
    quantity_total, quantity_available, quantity_issued, quantity_damaged,
    min_stock_level, status
  )
  SELECT
    ('d8030001-0000-4000-8000-' || lpad(g.i::TEXT, 12, '0'))::UUID,
    v_club_id,
    CASE (g.i % 12)
      WHEN 0 THEN v_cat_match WHEN 1 THEN v_cat_training WHEN 2 THEN v_cat_tracksuit
      WHEN 3 THEN v_cat_balls WHEN 4 THEN v_cat_markers WHEN 5 THEN v_cat_cones
      WHEN 6 THEN v_cat_goals WHEN 7 THEN v_cat_medical WHEN 8 THEN v_cat_strength
      WHEN 9 THEN v_cat_pitch WHEN 10 THEN v_cat_electronics ELSE v_cat_other
    END,
    CASE (g.i % 12)
      WHEN 0 THEN 'Koszulka meczowa senior ' || g.i
      WHEN 1 THEN 'Koszulka treningowa ' || g.i
      WHEN 2 THEN 'Dres klubowy ' || g.i
      WHEN 3 THEN 'Piłka treningowa ' || g.i
      WHEN 4 THEN 'Znacznik treningowy ' || g.i
      WHEN 5 THEN 'Pachołek ' || g.i
      WHEN 6 THEN 'Bramka składana ' || g.i
      WHEN 7 THEN 'Apteczka sportowa ' || g.i
      WHEN 8 THEN 'Hantle treningowe ' || g.i
      WHEN 9 THEN 'Siatka bramkowa ' || g.i
      WHEN 10 THEN 'Kamera analizy ' || g.i
      ELSE 'Akcesorium klubowe ' || g.i
    END,
    'PIORUN-MAG-' || lpad(g.i::TEXT, 4, '0'),
    'INT-' || g.i,
    'Pozycja magazynowa nr ' || g.i || ' — Piorun Wawrzeńczyce',
    (DATE '2024-01-01' + ((g.i * 3) % 700))::DATE,
    (50 + (g.i * 17) % 950)::NUMERIC(12,2),
    CASE (g.i % 5)
      WHEN 0 THEN v_supplier_sport WHEN 1 THEN v_supplier_nike WHEN 2 THEN v_supplier_med
      WHEN 3 THEN v_supplier_ele ELSE v_supplier_local
    END,
    CASE WHEN g.i % 12 = 3 THEN 20 + (g.i % 5) ELSE 1 + (g.i % 4) END,
    CASE WHEN g.i % 12 = 3 THEN 20 + (g.i % 5) ELSE 1 + (g.i % 4) END,
    0,
    0,
    CASE WHEN g.i % 12 = 3 THEN 5 ELSE 1 END,
    'available'
  FROM generate_series(1, 100) AS g(i);

  SELECT id INTO v_ball_id FROM public.inventory_items
  WHERE club_id = v_club_id AND inventory_number = 'PIORUN-MAG-0004' LIMIT 1;

  -- Stroje zawodników (25 graczy)
  FOR v_i IN 1..25 LOOP
    v_player_id := ('c1000001-0000-4000-8000-' || lpad(v_i::TEXT, 12, '0'))::UUID;

    INSERT INTO public.inventory_player_kits (
      club_id, player_id, jersey_number, jersey_size, shorts_size, tracksuit_size
    ) VALUES (
      v_club_id, v_player_id, v_i,
      v_sizes[1 + (v_i % 6)], v_sizes[1 + ((v_i + 1) % 6)], v_sizes[1 + ((v_i + 2) % 6)]
    );

    SELECT id INTO v_kit_id FROM public.inventory_items
    WHERE club_id = v_club_id AND inventory_number = 'PIORUN-MAG-' || lpad(((v_i - 1) % 25 + 1)::TEXT, 4, '0')
    LIMIT 1;

    IF v_kit_id IS NOT NULL THEN
      INSERT INTO public.inventory_transactions (
        id, club_id, item_id, recipient_type, player_id, quantity,
        issue_date, expected_return_date, issued_by, notes
      ) VALUES (
        ('d8040001-0000-4000-8000-' || lpad(v_i::TEXT, 12, '0'))::UUID,
        v_club_id, v_kit_id, 'player', v_player_id, 1,
        '2025-08-01', '2026-06-30', COALESCE(v_coach_id, v_director_id),
        'Komplet meczowy sezon 2025/2026'
      ) RETURNING id INTO v_tx;

      INSERT INTO public.inventory_kit_assignments (
        club_id, player_id, item_id, transaction_id, kit_name, assigned_date
      ) VALUES (
        v_club_id, v_player_id, v_kit_id, v_tx,
        'Komplet meczowy senior ' || v_i, '2025-08-01'
      );
    END IF;
  END LOOP;

  -- Wydanie piłek trenerowi
  IF v_ball_id IS NOT NULL AND v_coach_id IS NOT NULL THEN
    INSERT INTO public.inventory_transactions (
      club_id, item_id, recipient_type, profile_id, quantity,
      issue_date, expected_return_date, issued_by, notes
    ) VALUES (
      v_club_id, v_ball_id, 'coach', v_coach_id, 10,
      '2025-09-01', '2026-06-30', v_coach_id, 'Piłki na treningi tygodniowe'
    );
  END IF;

  -- Uszkodzenia (8 rekordów)
  INSERT INTO public.inventory_damages (club_id, item_id, description, damage_date, status, reported_by)
  SELECT
    v_club_id,
    i.id,
    'Uszkodzenie — ' || i.name,
    (DATE '2025-10-01' + (g.i || ' days')::INTERVAL)::DATE,
    (ARRAY['reported','in_repair','repaired','replacement_needed']::public.inventory_damage_status[])[1 + (g.i % 4)],
    COALESCE(v_coach_id, v_director_id)
  FROM generate_series(1, 8) AS g(i)
  JOIN public.inventory_items i ON i.club_id = v_club_id
    AND i.inventory_number = 'PIORUN-MAG-' || lpad(g.i::TEXT, 4, '0');

  UPDATE public.inventory_items i
  SET quantity_damaged = 1, quantity_available = GREATEST(quantity_available - 1, 0), status = 'damaged'
  FROM generate_series(1, 5) AS g(i)
  WHERE i.club_id = v_club_id
    AND i.inventory_number = 'PIORUN-MAG-' || lpad(g.i::TEXT, 4, '0')
    AND i.quantity_total >= 1;

  -- Zwrot częściowy (3 rekordy)
  INSERT INTO public.inventory_returns (club_id, item_id, return_date, quantity, condition, recorded_by, notes)
  SELECT
    v_club_id, t.item_id, '2026-02-15', 1, 'functional', COALESCE(v_coach_id, v_director_id), 'Zwrot po treningu'
  FROM public.inventory_transactions t
  WHERE t.club_id = v_club_id AND t.player_id IS NOT NULL
  LIMIT 3;

  -- Inwentaryzacja
  INSERT INTO public.inventory_stocktakes (id, club_id, name, stocktake_type, status, conducted_by, completed_at, notes)
  VALUES
    ('d8050001-0000-4000-8000-000000000001', v_club_id, 'Inwentaryzacja piłek Q1 2026', 'partial', 'completed',
      COALESCE(v_director_id, v_coach_id), timezone('utc', now()), 'Kontrola piłek treningowych'),
    ('d8050001-0000-4000-8000-000000000002', v_club_id, 'Inwentaryzacja pełna — marzec 2026', 'full', 'in_progress',
      COALESCE(v_director_id, v_coach_id), NULL, 'Trwa liczenie całego magazynu');

  INSERT INTO public.inventory_stocktake_lines (club_id, stocktake_id, item_id, system_quantity, actual_quantity, notes)
  SELECT v_club_id, 'd8050001-0000-4000-8000-000000000001', i.id, i.quantity_total, i.quantity_total, 'Zgodne'
  FROM public.inventory_items i
  WHERE i.club_id = v_club_id AND i.category_id = v_cat_balls
  LIMIT 10;

  -- Zamówienia
  INSERT INTO public.inventory_purchase_orders (id, club_id, supplier_id, order_number, status, order_date, expected_delivery, created_by, notes)
  VALUES
    ('d8060001-0000-4000-8000-000000000001', v_club_id, v_supplier_nike, 'ZAM/2026/001', 'delivered', '2025-11-01', '2025-12-15', v_director_id, 'Stroje wyjazdowe'),
    ('d8060001-0000-4000-8000-000000000002', v_club_id, v_supplier_sport, 'ZAM/2026/002', 'in_progress', '2026-02-01', '2026-03-20', v_director_id, 'Piłki i pachołki'),
    ('d8060001-0000-4000-8000-000000000003', v_club_id, v_supplier_med, 'ZAM/2026/003', 'draft', '2026-03-01', NULL, v_director_id, 'Apteczki i taśmy');

  INSERT INTO public.inventory_purchase_order_lines (club_id, order_id, description, quantity, unit_price)
  VALUES
    (v_club_id, 'd8060001-0000-4000-8000-000000000001', 'Komplety wyjazdowe senior 25 szt.', 25, 189.00),
    (v_club_id, 'd8060001-0000-4000-8000-000000000002', 'Piłki treningowe Select', 30, 89.00),
    (v_club_id, 'd8060001-0000-4000-8000-000000000003', 'Zestaw apteczek sportowych', 5, 250.00);

  -- Raporty magazynowe
  INSERT INTO public.inventory_reports (id, club_id, title, report_type, period_start, period_end, content, status, generated_by)
  VALUES
    ('d8070001-0000-4000-8000-000000000001', v_club_id, 'Stan magazynu — marzec 2026', 'stock_status', '2026-03-01', '2026-03-31',
      '{"totalItems":100,"lowStockCount":8,"damagedCount":5,"issuedCount":35}'::JSONB, 'published', v_director_id),
    ('d8070001-0000-4000-8000-000000000002', v_club_id, 'Wydany sprzęt Q1 2026', 'issued_equipment', '2026-01-01', '2026-03-31',
      '{"issuesCount":28,"ballsIssued":10,"kitsIssued":25}'::JSONB, 'published', v_director_id),
    ('d8070001-0000-4000-8000-000000000003', v_club_id, 'Uszkodzony sprzęt 2026', 'damaged_equipment', '2026-01-01', '2026-12-31',
      '{"damagesCount":8,"replacementNeeded":2}'::JSONB, 'draft', v_director_id);

  -- Odśwież statusy pozycji
  PERFORM public.refresh_inventory_item_status(id)
  FROM public.inventory_items WHERE club_id = v_club_id;

END $$;
