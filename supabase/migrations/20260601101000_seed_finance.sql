-- ETAP 7: Seed danych finansowych — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_team_id UUID := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  v_treasurer_id UUID;
  v_parent_id UUID;
  v_sponsor_budmax UUID := 'c6010001-0000-4000-8000-000000000001';
  v_budget_season UUID := 'c7010001-0000-4000-8000-000000000001';
  v_budget_team UUID := 'c7010001-0000-4000-8000-000000000002';
  v_budget_event UUID := 'c7010001-0000-4000-8000-000000000003';
  v_grant_um UUID := 'c7020001-0000-4000-8000-000000000001';
  v_grant_gmin UUID := 'c7020001-0000-4000-8000-000000000002';
  v_plan_monthly UUID := 'c7030001-0000-4000-8000-000000000001';
  v_plan_onetime UUID := 'c7030001-0000-4000-8000-000000000002';
  v_i INTEGER;
  v_player_id UUID;
  v_fee_id UUID;
BEGIN
  SELECT id INTO v_treasurer_id FROM public.profiles WHERE email = 'skarbnik@piorun.test' LIMIT 1;
  SELECT id INTO v_parent_id FROM public.profiles WHERE email = 'rodzic@piorun.test' LIMIT 1;

  IF v_treasurer_id IS NOT NULL THEN
    INSERT INTO public.club_memberships (club_id, user_id, role, status)
    VALUES (v_club_id, v_treasurer_id, 'treasurer', 'active')
    ON CONFLICT (club_id, user_id, role) DO UPDATE SET status = 'active';
  END IF;

  DELETE FROM public.finance_player_fee_payments WHERE club_id = v_club_id;
  DELETE FROM public.finance_income WHERE club_id = v_club_id;
  DELETE FROM public.finance_expenses WHERE club_id = v_club_id;
  DELETE FROM public.finance_player_fees WHERE club_id = v_club_id;
  DELETE FROM public.finance_documents WHERE club_id = v_club_id;
  DELETE FROM public.finance_reports WHERE club_id = v_club_id;
  DELETE FROM public.finance_budgets WHERE club_id = v_club_id;
  DELETE FROM public.finance_grants WHERE club_id = v_club_id;
  DELETE FROM public.finance_fee_plans WHERE club_id = v_club_id;
  DELETE FROM public.player_guardians WHERE club_id = v_club_id;

  IF v_parent_id IS NOT NULL THEN
    INSERT INTO public.player_guardians (club_id, player_id, profile_id, relationship)
    VALUES (v_club_id, 'c1000001-0000-4000-8000-000000000006', v_parent_id, 'Rodzic')
    ON CONFLICT (club_id, player_id, profile_id) DO NOTHING;
  END IF;

  INSERT INTO public.finance_fee_plans (id, club_id, name, fee_type, amount, team_id, is_active)
  VALUES
    (v_plan_monthly, v_club_id, 'Składka miesięczna seniorzy', 'monthly', 150.00, v_team_id, TRUE),
    (v_plan_onetime, v_club_id, 'Opłata wpisowa', 'one_time', 200.00, v_team_id, TRUE);

  INSERT INTO public.finance_grants (id, club_id, source, amount, period_start, period_end, status, description)
  VALUES
    (v_grant_um, v_club_id, 'Urząd Miasta Wrocławia', 25000.00, '2025-01-01', '2025-12-31', 'active', 'Dotacja na rozwój sportu młodzieżowego'),
    (v_grant_gmin, v_club_id, 'Gmina Kąty Wrocławskie', 8000.00, '2025-07-01', '2026-06-30', 'active', 'Wsparcie na utrzymanie boiska'),
    ('c7020001-0000-4000-8000-000000000003', v_club_id, 'Fundacja Orły Sportu', 5000.00, '2026-01-01', '2026-12-31', 'planned', 'Planowana dotacja na sprzęt');

  INSERT INTO public.finance_budgets (id, club_id, name, budget_type, team_id, season, period_start, period_end, planned_amount, notes)
  VALUES
    (v_budget_season, v_club_id, 'Budżet sezonowy 2025/2026', 'season', NULL, '2025/2026', '2025-07-01', '2026-06-30', 180000.00, 'Plan roczny klubu'),
    (v_budget_team, v_club_id, 'Budżet drużyny Seniorów', 'team', v_team_id, '2025/2026', '2025-07-01', '2026-06-30', 95000.00, 'Koszty operacyjne seniorów'),
    (v_budget_event, v_club_id, 'Turniej Letni 2026', 'event', NULL, NULL, '2026-06-01', '2026-06-15', 12000.00, 'Organizacja turnieju');

  -- Składki zawodników (25 graczy × 3 miesiące = 75, wybieramy reprezentatywne)
  FOR v_i IN 1..25 LOOP
    v_player_id := ('c1000001-0000-4000-8000-' || lpad(v_i::TEXT, 12, '0'))::UUID;

    INSERT INTO public.finance_player_fees (
      club_id, player_id, fee_plan_id, name, due_date, amount_due, amount_paid, period_month
    ) VALUES
      (v_club_id, v_player_id, v_plan_monthly, 'Składka marzec 2026', '2026-03-10', 150.00,
        CASE WHEN v_i <= 18 THEN 150.00 WHEN v_i <= 22 THEN 75.00 ELSE 0 END, '2026-03-01'),
      (v_club_id, v_player_id, v_plan_monthly, 'Składka kwiecień 2026', '2026-04-10', 150.00,
        CASE WHEN v_i <= 15 THEN 150.00 WHEN v_i = 16 THEN 50.00 ELSE 0 END, '2026-04-01'),
      (v_club_id, v_player_id, v_plan_onetime, 'Opłata wpisowa 2025/2026', '2025-08-15', 200.00,
        CASE WHEN v_i <= 20 THEN 200.00 ELSE 0 END, NULL);
  END LOOP;

  -- Przychody (28 rekordów)
  INSERT INTO public.finance_income (club_id, transaction_date, amount, description, category, sponsor_id, grant_id, created_by)
  SELECT
    v_club_id,
    (DATE '2025-09-01' + (g.i || ' days')::INTERVAL)::DATE,
    (500 + (g.i * 137) % 4500)::NUMERIC(12,2),
    CASE (g.i % 6)
      WHEN 0 THEN 'Wpłata sponsorska — rata ' || g.i
      WHEN 1 THEN 'Składki zawodników — zbiorcza ' || g.i
      WHEN 2 THEN 'Dotacja — transza ' || g.i
      WHEN 3 THEN 'Darowizna od kibica ' || g.i
      WHEN 4 THEN 'Sprzedaż koszulek meczowych ' || g.i
      ELSE 'Inny przychód ' || g.i
    END,
    (ARRAY['sponsors','player_fees','grants','donations','club_sales','other']::public.finance_income_category[])[1 + (g.i % 6)],
    CASE WHEN g.i % 6 = 0 THEN v_sponsor_budmax ELSE NULL END,
    CASE WHEN g.i % 6 = 2 THEN v_grant_um ELSE NULL END,
    v_treasurer_id
  FROM generate_series(1, 28) AS g(i);

  -- Koszty (28 rekordów)
  INSERT INTO public.finance_expenses (club_id, transaction_date, amount, description, category, created_by)
  SELECT
    v_club_id,
    (DATE '2025-09-05' + (g.i || ' days')::INTERVAL)::DATE,
    (200 + (g.i * 89) % 3200)::NUMERIC(12,2),
    CASE (g.i % 9)
      WHEN 0 THEN 'Piłki treningowe — partia ' || g.i
      WHEN 1 THEN 'Stroje wyjazdowe ' || g.i
      WHEN 2 THEN 'Sędziowie mecz ligowy ' || g.i
      WHEN 3 THEN 'Transport autokar ' || g.i
      WHEN 4 THEN 'Utrzymanie boiska ' || g.i
      WHEN 5 THEN 'Obóz treningowy ' || g.i
      WHEN 6 THEN 'Reklama Facebook ' || g.i
      WHEN 7 THEN 'Biuro — druk i poczta ' || g.i
      ELSE 'Inny koszt ' || g.i
    END,
    (ARRAY['equipment','kits','referees','transport','pitch','training','marketing','administration','other']::public.finance_expense_category[])[1 + (g.i % 9)],
    v_treasurer_id
  FROM generate_series(1, 28) AS g(i);

  -- Dokumenty (metadane)
  INSERT INTO public.finance_documents (
    club_id, document_type, title, storage_path, file_name, mime_type, issue_date, amount, sponsor_id, uploaded_by
  ) VALUES
    (v_club_id, 'invoice', 'Faktura Budmax Q1 2026', v_club_id || '/finance/invoices/budmax-q1.pdf', 'budmax-q1.pdf', 'application/pdf', '2026-01-15', 15000.00, v_sponsor_budmax, v_treasurer_id),
    (v_club_id, 'receipt', 'Paragon piłki treningowe', v_club_id || '/finance/receipts/balls-2026.pdf', 'balls-2026.pdf', 'application/pdf', '2026-02-03', 890.00, NULL, v_treasurer_id),
    (v_club_id, 'contract', 'Umowa najmu boiska', v_club_id || '/finance/contracts/pitch-lease.pdf', 'pitch-lease.pdf', 'application/pdf', '2025-07-01', 24000.00, NULL, v_treasurer_id);

  -- Raporty finansowe
  INSERT INTO public.finance_reports (id, club_id, title, period_type, period_start, period_end, content, status, generated_by)
  VALUES
    ('c7040001-0000-4000-8000-000000000001', v_club_id, 'Raport miesięczny — marzec 2026', 'monthly', '2026-03-01', '2026-03-31',
      '{"totalIncome":42500,"totalExpenses":18750,"balance":23750,"overdueFeesCount":12}'::JSONB, 'published', v_treasurer_id),
    ('c7040001-0000-4000-8000-000000000002', v_club_id, 'Raport kwartalny Q1 2026', 'quarterly', '2026-01-01', '2026-03-31',
      '{"totalIncome":98500,"totalExpenses":45200,"balance":53300,"overdueFeesCount":8}'::JSONB, 'published', v_treasurer_id),
    ('c7040001-0000-4000-8000-000000000003', v_club_id, 'Raport roczny 2025/2026 (projekcja)', 'yearly', '2025-07-01', '2026-06-30',
      '{"totalIncome":165000,"totalExpenses":142000,"balance":23000,"overdueFeesCount":15}'::JSONB, 'draft', v_treasurer_id);

  -- Płatności składek (historia dla rodzica — Marcin Lewandowski)
  SELECT id INTO v_fee_id FROM public.finance_player_fees
  WHERE club_id = v_club_id AND player_id = 'c1000001-0000-4000-8000-000000000006'
    AND name = 'Składka marzec 2026' LIMIT 1;

  IF v_fee_id IS NOT NULL THEN
    UPDATE public.finance_player_fees SET amount_paid = 0 WHERE id = v_fee_id;
    INSERT INTO public.finance_player_fee_payments (club_id, player_fee_id, payment_date, amount, note, recorded_by)
    VALUES (v_club_id, v_fee_id, '2026-03-05', 75.00, 'Wpłata częściowa', v_treasurer_id);
  END IF;

END $$;
