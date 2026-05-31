-- ETAP 10 seed: integracje Piorun Wawrzeńczyce / GLKS Mietków

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_owner_id UUID;
  v_director_id UUID;
  v_coach_id UUID;
  v_team_senior UUID;
  v_team_u18 UUID;
  v_team_u12 UUID;
  v_team_u10 UUID;
  v_int_dzpn UUID := 'f9011001-0001-4000-8000-000000000001';
  v_int_pzpn UUID := 'f9011002-0002-4000-8000-000000000002';
  v_int_extranet UUID := 'f9011003-0003-4000-8000-000000000003';
  v_int_manual UUID := 'f9011004-0004-4000-8000-000000000004';
  v_league_b UUID := 'f9012001-0001-4000-8000-000000000001';
  v_job_ok UUID := 'f9013001-0001-4000-8000-000000000001';
  v_job_partial UUID := 'f9013002-0002-4000-8000-000000000002';
  v_job_err UUID := 'f9013003-0003-4000-8000-000000000003';
  v_log_ok UUID := 'f9014001-0001-4000-8000-000000000001';
  v_log_partial UUID := 'f9014002-0002-4000-8000-000000000002';
  v_log_err UUID := 'f9014003-0003-4000-8000-000000000003';
BEGIN
  SELECT id INTO v_owner_id FROM public.profiles WHERE email = 'wlasciciel@piorun.test' LIMIT 1;
  SELECT id INTO v_director_id FROM public.profiles WHERE email = 'dyrektor@piorun.test' LIMIT 1;
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;

  SELECT id INTO v_team_senior FROM public.teams WHERE club_id = v_club_id AND category = 'seniors' LIMIT 1;
  SELECT id INTO v_team_u18 FROM public.teams WHERE club_id = v_club_id AND category = 'u18' LIMIT 1;
  SELECT id INTO v_team_u12 FROM public.teams WHERE club_id = v_club_id AND category = 'u12' LIMIT 1;
  SELECT id INTO v_team_u10 FROM public.teams WHERE club_id = v_club_id AND category = 'u10' LIMIT 1;

  DELETE FROM public.integration_imports WHERE club_id = v_club_id;
  DELETE FROM public.sync_conflicts WHERE club_id = v_club_id;
  DELETE FROM public.sync_logs WHERE club_id = v_club_id;
  DELETE FROM public.sync_jobs WHERE club_id = v_club_id;
  DELETE FROM public.external_matches WHERE club_id = v_club_id;
  DELETE FROM public.external_teams WHERE club_id = v_club_id;
  DELETE FROM public.external_leagues WHERE club_id = v_club_id;
  DELETE FROM public.integration_club_mappings WHERE club_id = v_club_id;
  DELETE FROM public.integration_sources WHERE club_id = v_club_id;
  DELETE FROM public.integrations WHERE club_id = v_club_id;

  INSERT INTO public.integrations (id, club_id, provider, status, base_url, api_key_configured, auto_sync_enabled, config, last_sync_at)
  VALUES
    (v_int_dzpn, v_club_id, 'dzpn', 'ready', 'https://dzpn.example.local/api', FALSE, FALSE,
      '{"note":"Brak publicznego API DZPN — synchronizacja przez import CSV/JSON lub dane staging."}'::jsonb,
      timezone('utc', now()) - INTERVAL '2 days'),
    (v_int_pzpn, v_club_id, 'pzpn', 'not_configured', NULL, FALSE, FALSE,
      '{"note":"PZPN nie udostępnia publicznego API rozgrywek amatorskich — terminarze w PDF/RSS wewnętrznie."}'::jsonb,
      NULL),
    (v_int_extranet, v_club_id, 'extranet', 'disabled', 'https://extranet.example.local', FALSE, FALSE,
      '{"note":"Extranet — wysyłka raportów meczowych (przygotowane pod przyszłe API)."}'::jsonb,
      NULL),
    (v_int_manual, v_club_id, 'manual', 'ready', NULL, FALSE, FALSE,
      '{"note":"Ręczne wprowadzanie i import plików."}'::jsonb,
      timezone('utc', now()) - INTERVAL '1 day');

  INSERT INTO public.integration_sources (club_id, integration_id, name, format, source_url, is_active, priority, config)
  VALUES
    (v_club_id, v_int_dzpn, 'Tabela B Klasy — CSV sezonowa', 'csv', NULL, TRUE, 10,
      '{"competition":"B Klasa","season":"2025/2026"}'::jsonb),
    (v_club_id, v_int_dzpn, 'Terminarz — JSON lokalny', 'json', NULL, TRUE, 20,
      '{"competition":"B Klasa","season":"2025/2026"}'::jsonb),
    (v_club_id, v_int_manual, 'Wyniki — ręczne', 'manual', NULL, TRUE, 0, '{}'::jsonb);

  INSERT INTO public.integration_club_mappings (club_id, public_name, league_name, external_club_id, provider, is_primary, notes)
  VALUES
    (v_club_id, 'Piorun Wawrzeńczyce', 'GLKS Mietków', 'DZPN-CLUB-4821', 'dzpn', TRUE,
      'Nazwa brandingowa vs nazwa ligowa w rozgrywkach DZPN.'),
    (v_club_id, 'Piorun Wawrzeńczyce', 'GLKS Mietków', NULL, 'manual', FALSE,
      'Mapowanie domyślne dla importów ręcznych.');

  INSERT INTO public.external_leagues (id, club_id, provider, external_id, external_name, competition, season, last_synced_at)
  VALUES
    (v_league_b, v_club_id, 'dzpn', 'DZPN-LIGA-B-2025', 'B Klasa — grupa wrocławska', 'B Klasa', '2025/2026',
      timezone('utc', now()) - INTERVAL '2 days');

  INSERT INTO public.external_teams (club_id, team_id, provider, external_id, external_name, category_label, competition, season)
  VALUES
    (v_club_id, v_team_senior, 'dzpn', 'DZPN-T-SEN-4821', 'GLKS Mietków', 'Seniorzy', 'B Klasa', '2025/2026'),
    (v_club_id, v_team_u18, 'dzpn', 'DZPN-T-U18-4821', 'GLKS Mietków U18', 'Juniorzy', 'Klasa A U18', '2025/2026'),
    (v_club_id, v_team_u12, 'dzpn', 'DZPN-T-U12-4821', 'GLKS Mietków U12', 'Trampkarze', 'Klasa B U12', '2025/2026'),
    (v_club_id, v_team_u10, 'dzpn', 'DZPN-T-U10-4821', 'GLKS Mietków U10', 'Młodziki', 'Klasa C U10', '2025/2026');

  INSERT INTO public.external_matches (
    club_id, external_league_id, provider, external_id, competition, season, round_number,
    match_date, match_time, home_team_name, away_team_name, home_score, away_score, status, raw_payload
  ) VALUES
    (v_club_id, v_league_b, 'dzpn', 'DZPN-M-001', 'B Klasa', '2025/2026', 12,
      CURRENT_DATE + 7, '15:00', 'GLKS Mietków', 'KS Orzeł', NULL, NULL, 'scheduled',
      '{"source":"seed","round":12}'::jsonb),
    (v_club_id, v_league_b, 'dzpn', 'DZPN-M-002', 'B Klasa', '2025/2026', 11,
      CURRENT_DATE - 7, '15:00', 'GLKS Mietków', 'LKS Grom', 3, 1, 'completed',
      '{"source":"seed","round":11}'::jsonb),
    (v_club_id, v_league_b, 'manual', 'MAN-M-003', 'B Klasa', '2025/2026', 10,
      CURRENT_DATE - 14, '16:00', 'KS Śląsk II', 'GLKS Mietków', 2, 2, 'completed',
      '{"source":"manual_import"}'::jsonb);

  INSERT INTO public.sync_jobs (id, club_id, integration_id, job_type, trigger_type, status, started_at, completed_at, created_by)
  VALUES
    (v_job_ok, v_club_id, v_int_dzpn, 'league_table', 'manual', 'completed',
      timezone('utc', now()) - INTERVAL '2 days 1 hour', timezone('utc', now()) - INTERVAL '2 days', v_director_id),
    (v_job_partial, v_club_id, v_int_manual, 'fixtures', 'import', 'completed',
      timezone('utc', now()) - INTERVAL '1 day 2 hours', timezone('utc', now()) - INTERVAL '1 day', v_director_id),
    (v_job_err, v_club_id, v_int_pzpn, 'fixtures', 'automatic', 'failed',
      timezone('utc', now()) - INTERVAL '3 hours', timezone('utc', now()) - INTERVAL '3 hours', NULL);

  INSERT INTO public.sync_logs (
    id, club_id, integration_id, sync_job_id, provider, job_type, trigger_type, status,
    message, records_processed, records_failed, quality_issues, started_at, completed_at, created_by
  ) VALUES
    (v_log_ok, v_club_id, v_int_dzpn, v_job_ok, 'dzpn', 'league_table', 'manual', 'success',
      'Zsynchronizowano tabelę B Klasy (10 drużyn) ze stagingu DZPN.', 10, 0, '[]'::jsonb,
      timezone('utc', now()) - INTERVAL '2 days 1 hour', timezone('utc', now()) - INTERVAL '2 days', v_director_id),
    (v_log_partial, v_club_id, v_int_manual, v_job_partial, 'manual', 'fixtures', 'import', 'partial',
      'Import terminarza: 8 meczów OK, 1 duplikat pominięty.', 8, 1,
      '[{"code":"duplicate","message":"Mecz DZPN-M-001 już istnieje w stagingu."}]'::jsonb,
      timezone('utc', now()) - INTERVAL '1 day 2 hours', timezone('utc', now()) - INTERVAL '1 day', v_director_id),
    (v_log_err, v_club_id, v_int_pzpn, v_job_err, 'pzpn', 'fixtures', 'automatic', 'error',
      'PZPN: brak publicznego API — synchronizacja automatyczna niemożliwa.', 0, 0,
      '[{"code":"api_unavailable","message":"Oficjalne API PZPN niedostępne dla klubów amatorskich."}]'::jsonb,
      timezone('utc', now()) - INTERVAL '3 hours', timezone('utc', now()) - INTERVAL '3 hours', NULL);

  INSERT INTO public.sync_conflicts (club_id, sync_log_id, entity_type, entity_key, local_data, external_data, status)
  VALUES (
    v_club_id, v_log_partial, 'match', 'DZPN-M-001',
    '{"homeScore":null,"awayScore":null,"matchTime":"15:00"}'::jsonb,
    '{"homeScore":null,"awayScore":null,"matchTime":"16:30"}'::jsonb,
    'pending'
  );

  INSERT INTO public.integration_imports (
    club_id, file_name, format, import_type, status, rows_total, rows_imported, rows_failed,
    quality_issues, sync_log_id, created_by, completed_at
  ) VALUES
    (v_club_id, 'terminarz-b-klasa-2025.csv', 'csv', 'fixtures', 'completed', 9, 8, 1,
      '[{"code":"duplicate","row":5}]'::jsonb, v_log_partial, v_director_id, timezone('utc', now()) - INTERVAL '1 day'),
    (v_club_id, 'tabela-b-klasa.json', 'json', 'league_table', 'completed', 10, 10, 0,
      '[]'::jsonb, v_log_ok, v_director_id, timezone('utc', now()) - INTERVAL '2 days');

END $$;
