-- ETAP 15.9 seed — Equipment & Assets (klub testowy Piorun)

DO $$
DECLARE
  v_club UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_owner UUID;
  v_coach UUID;
  v_player UUID := 'c1000001-0000-4000-8000-000000000006';
  cat_balls UUID;
  cat_match UUID;
  cat_medical UUID;
  cat_cones UUID;
  asset_balls UUID;
  asset_medkit UUID;
  asset_cones UUID;
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;
  SELECT id INTO v_coach FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;

  INSERT INTO public.asset_categories (club_id, slug, name, sort_order) VALUES
    (v_club, 'balls', 'Piłki', 1),
    (v_club, 'match_kits', 'Stroje meczowe', 2),
    (v_club, 'training_kits', 'Stroje treningowe', 3),
    (v_club, 'tracksuits', 'Dresy', 4),
    (v_club, 'markers', 'Znaczniki', 5),
    (v_club, 'cones', 'Pachołki', 6),
    (v_club, 'training_goals', 'Bramki treningowe', 7),
    (v_club, 'first_aid', 'Apteczki', 8),
    (v_club, 'medical', 'Sprzęt medyczny', 9),
    (v_club, 'electronics', 'Elektronika', 10),
    (v_club, 'other', 'Inne', 99)
  ON CONFLICT (club_id, slug) DO NOTHING;

  SELECT id INTO cat_balls FROM public.asset_categories WHERE club_id = v_club AND slug = 'balls';
  SELECT id INTO cat_match FROM public.asset_categories WHERE club_id = v_club AND slug = 'match_kits';
  SELECT id INTO cat_medical FROM public.asset_categories WHERE club_id = v_club AND slug = 'first_aid';
  SELECT id INTO cat_cones FROM public.asset_categories WHERE club_id = v_club AND slug = 'cones';

  INSERT INTO public.assets (
    club_id, category_id, name, inventory_number, description,
    purchase_date, purchase_value, condition, location, quantity, quantity_available, created_by
  ) VALUES
    (
      v_club, cat_balls, 'Piłki treningowe Nike (20 szt.)', 'EQ-001',
      'Piłki size 5 do treningów', '2024-08-01', 2400.00, 'good', 'Magazyn A', 20, 15, v_owner
    ),
    (
      v_club, cat_medical, 'Apteczka meczowa', 'EQ-002',
      'Kompletny zestaw pierwszej pomocy', '2023-05-10', 450.00, 'good', 'Szpitalik', 2, 1, v_owner
    ),
    (
      v_club, cat_cones, 'Pachołki treningowe (50 szt.)', 'EQ-003',
      'Pomarańczowe pachołki', '2022-01-15', 180.00, 'needs_repair', 'Magazyn A', 50, 50, v_owner
    ),
    (
      v_club, cat_match, 'Zestaw strojów meczowych 2025', 'EQ-004',
      'Stroje dom/wyjazd', '2025-01-20', 8500.00, 'new', 'Magazyn B', 1, 1, v_owner
    )
  ON CONFLICT DO NOTHING;

  SELECT id INTO asset_balls FROM public.assets WHERE club_id = v_club AND inventory_number = 'EQ-001';
  SELECT id INTO asset_medkit FROM public.assets WHERE club_id = v_club AND inventory_number = 'EQ-002';
  SELECT id INTO asset_cones FROM public.assets WHERE club_id = v_club AND inventory_number = 'EQ-003';

  IF asset_balls IS NOT NULL AND v_coach IS NOT NULL THEN
    INSERT INTO public.asset_assignments (
      club_id, asset_id, assignee_kind, profile_id, assignee_label, quantity, issued_by, notes
    ) VALUES (
      v_club, asset_balls, 'coach', v_coach, 'Trener główny', 5, v_owner, 'Piłki na trening tygodniowy'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF asset_medkit IS NOT NULL AND v_coach IS NOT NULL THEN
    INSERT INTO public.asset_assignments (
      club_id, asset_id, assignee_kind, profile_id, assignee_label, quantity, issued_by, due_at
    ) VALUES (
      v_club, asset_medkit, 'team_manager', v_coach, 'Kierownik drużyny', 1, v_owner,
      timezone('utc', now()) + interval '14 days'
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF asset_cones IS NOT NULL THEN
    INSERT INTO public.asset_maintenance (
      club_id, asset_id, maintenance_type, status, title, description, scheduled_at, reported_by
    ) VALUES (
      v_club, asset_cones, 'repair', 'reported', 'Wymiana pękniętych pachołków',
      'Około 8 sztuk ma pęknięcia', CURRENT_DATE + 7, v_coach
    )
    ON CONFLICT DO NOTHING;
  END IF;

  IF EXISTS (SELECT 1 FROM public.players WHERE id = v_player) THEN
    INSERT INTO public.equipment_kits (
      club_id, player_id, kit_type, jersey_number, size, notes, created_by
    ) VALUES
      (v_club, v_player, 'match_kit', 9, 'M', 'Stroj meczowy domowy', v_owner),
      (v_club, v_player, 'training_kit', NULL, 'L', NULL, v_owner),
      (v_club, v_player, 'tracksuit', NULL, 'L', 'Dres klubowy', v_owner)
    ON CONFLICT DO NOTHING;

    IF asset_balls IS NOT NULL THEN
      INSERT INTO public.asset_assignments (
        club_id, asset_id, assignee_kind, player_id, assignee_label, quantity, issued_by
      ) VALUES (
        v_club, asset_balls, 'player', v_player, 'Zawodnik testowy', 1, v_coach
      )
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
END $$;
