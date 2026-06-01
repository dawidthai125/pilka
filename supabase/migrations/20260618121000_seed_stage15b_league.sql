-- ETAP 15B seed: League Hub — Piorun Wawrzeńczyce / GLKS Mietków
-- Rozgrywki: B Klasa — Powiat Wrocławski, Grupa VII — sezon 2025/2026

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_team_senior UUID;
  v_season_2526 UUID := 'f9021001-0001-4000-8000-000000000001';
  v_season_2627 UUID := 'f9021002-0002-4000-8000-000000000002';
  v_comp_b UUID := 'f9022001-0001-4000-8000-000000000001';
  v_src_csv UUID := 'f9023001-0001-4000-8000-000000000001';
  v_src_json UUID := 'f9023002-0002-4000-8000-000000000002';
  v_src_api UUID := 'f9023003-0003-4000-8000-000000000003';
  v_job_ok UUID := 'f9024001-0001-4000-8000-000000000001';
  v_snapshot TIMESTAMPTZ := timezone('utc', now()) - INTERVAL '1 day';
BEGIN
  SELECT id INTO v_team_senior FROM public.teams WHERE club_id = v_club_id AND category = 'seniors' LIMIT 1;

  DELETE FROM public.league_conflicts WHERE club_id = v_club_id;
  DELETE FROM public.league_sync_logs WHERE club_id = v_club_id;
  DELETE FROM public.league_sync_jobs WHERE club_id = v_club_id;
  DELETE FROM public.league_matches WHERE club_id = v_club_id;
  DELETE FROM public.league_tables WHERE club_id = v_club_id;
  DELETE FROM public.league_player_registry WHERE club_id = v_club_id;
  DELETE FROM public.league_teams WHERE club_id = v_club_id;
  DELETE FROM public.league_sources WHERE club_id = v_club_id;
  DELETE FROM public.league_competitions WHERE club_id = v_club_id;
  DELETE FROM public.league_seasons WHERE club_id = v_club_id;

  INSERT INTO public.league_seasons (id, club_id, name, is_active, start_date, end_date)
  VALUES
    (v_season_2526, v_club_id, '2025/2026', TRUE, '2025-07-01', '2026-06-30'),
    (v_season_2627, v_club_id, '2026/2027', FALSE, '2026-07-01', '2027-06-30');

  INSERT INTO public.league_competitions (id, club_id, season_id, name, category_label, provider, notes, is_active)
  VALUES (
    v_comp_b, v_club_id, v_season_2526,
    'B Klasa — Powiat Wrocławski, Grupa VII',
    'Seniorzy — B Klasa',
    'DZPN',
    'DZPN / Extranet → mPZPN / ŁNP. Mirror dev: 90minut liga14526, regionalnyfutbol Wrocław VII. Dokumentacja: docs/research/pzpn-data-ecosystem.md',
    TRUE
  );

  INSERT INTO public.league_sources (id, club_id, competition_id, name, adapter, provider_label, is_active, config)
  VALUES
    (v_src_csv, v_club_id, v_comp_b, 'Tabela — CSV (import)', 'csv', 'DZPN', TRUE,
      '{"note":"Import CSV; źródło oficjalne docelowo: competition-api-pro po credentials PZPN."}'::jsonb),
    (v_src_json, v_club_id, v_comp_b, 'Terminarz — JSON (import)', 'json', 'DZPN', TRUE,
      '{"note":"Import JSON; mirror referencyjny: fixtures/league/live/."}'::jsonb),
    (v_src_api, v_club_id, v_comp_b, 'FutureApiAdapter — competition-api-pro', 'api', 'PZPN', FALSE,
      '{"note":"Placeholder — competition-api-pro.laczynaspilka.pl (401 bez umowy)."}'::jsonb);

  INSERT INTO public.league_teams (club_id, competition_id, team_id, display_name, league_name, external_id, is_own_club, provider, notes)
  VALUES
    (v_club_id, v_comp_b, v_team_senior, 'Piorun Wawrzeńczyce', 'GLKS Mietków', 'DZPN-CLUB-4821', TRUE, 'DZPN',
      'FC OS: Piorun Wawrzeńczyce. Extranet/mPZPN/ŁNP: GLKS Mietków. B Klasa, Powiat Wrocławski, Grupa VII, sezon 2025/2026.'),
    (v_club_id, v_comp_b, NULL, 'MKS Magnice', 'MKS Magnice', NULL, FALSE, 'DZPN', 'Liga referencyjna — Grupa VII'),
    (v_club_id, v_comp_b, NULL, 'Orzeł Sadowice', 'Orzeł Sadowice', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'LKS Sadków', 'LKS Sadków', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'KP II Kąty Wrocławskie', 'KP II Kąty Wrocławskie', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'Tarant Krzyżowice', 'Tarant Krzyżowice', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'KS Piotrowice', 'KS Piotrowice', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'Polonia Jaksonów', 'Polonia Jaksonów', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'Zachód Sobótka', 'Zachód Sobótka', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'Sparta Pustków Żurawski', 'Sparta Pustków Żurawski', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'KP II Kobierzyce', 'KP II Kobierzyce', NULL, FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'Wicher Domasław', 'Wicher Domasław', NULL, FALSE, 'DZPN', 'Wycofanie po rundzie jesiennej');

  INSERT INTO public.league_tables (
    club_id, competition_id, season_id, source_id, snapshot_at,
    team_name, position, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, is_own_club
  )
  VALUES
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'MKS Magnice', 1, 20, 14, 5, 1, 69, 32, 37, 47, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'Orzeł Sadowice', 2, 20, 14, 1, 5, 80, 40, 40, 43, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'LKS Sadków', 3, 20, 13, 1, 6, 50, 37, 13, 40, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'KP II Kąty Wrocławskie', 4, 20, 11, 2, 7, 79, 63, 16, 35, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'Tarant Krzyżowice', 5, 20, 10, 4, 6, 62, 43, 19, 34, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'KS Piotrowice', 6, 20, 8, 6, 6, 58, 56, 2, 30, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'Polonia Jaksonów', 7, 20, 8, 3, 9, 62, 57, 5, 27, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'Zachód Sobótka', 8, 20, 8, 1, 11, 38, 60, -22, 25, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'Sparta Pustków Żurawski', 9, 20, 7, 2, 11, 51, 66, -15, 23, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'KP II Kobierzyce', 10, 20, 5, 2, 13, 42, 63, -21, 17, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'GLKS Mietków', 11, 20, 4, 2, 14, 24, 63, -39, 14, TRUE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'Wicher Domasław', 12, 20, 2, 3, 15, 23, 58, -35, 9, FALSE);

  INSERT INTO public.league_matches (
    club_id, competition_id, season_id, source_id, external_key,
    round_number, match_date, match_time, home_team_name, away_team_name,
    home_score, away_score, status, sync_status
  )
  VALUES
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2526-r01-jaksonow-mietkow',
      1, '2025-08-24', '11:00', 'Polonia Jaksonów', 'GLKS Mietków', 2, 3, 'completed', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2526-r02-kobierzyce-mietkow',
      2, '2025-08-31', '14:30', 'KP II Kobierzyce', 'GLKS Mietków', 5, 0, 'completed', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2526-r03-mietkow-piotrowice',
      3, '2025-09-07', '11:00', 'GLKS Mietków', 'KS Piotrowice', 0, 4, 'completed', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2526-r20-sparta-mietkow',
      20, '2026-05-30', '16:00', 'Sparta Pustków Żurawski', 'GLKS Mietków', 3, 5, 'completed', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2526-r21-mietkow-sobotka',
      21, '2026-06-07', '11:00', 'GLKS Mietków', 'Zachód Sobótka', NULL, NULL, 'scheduled', 'pending');

  INSERT INTO public.league_sync_jobs (
    id, club_id, source_id, competition_id, import_type, status,
    records_processed, records_failed, records_conflicts, started_at, completed_at, metadata
  )
  VALUES (
    v_job_ok, v_club_id, v_src_csv, v_comp_b, 'league_table', 'completed',
    12, 0, 0, v_snapshot, v_snapshot + INTERVAL '2 minutes',
    '{"note":"Seed ETAP 15B — tabela referencyjna B Klasa Powiat Wrocławski Grupa VII 2025/2026."}'::jsonb
  );

  INSERT INTO public.league_sync_logs (job_id, club_id, level, message)
  VALUES
    (v_job_ok, v_club_id, 'info', 'Zaimportowano tabelę referencyjną: 12 drużyn (Grupa VII).'),
    (v_job_ok, v_club_id, 'info', 'GLKS Mietków ↔ Piorun Wawrzeńczyce — mapowanie własnej drużyny.');

  INSERT INTO public.league_player_registry (club_id, competition_id, season_id, league_player_name, league_team_name, jersey_number, notes)
  VALUES
    (v_club_id, v_comp_b, v_season_2526, 'Kowalski J.', 'GLKS Mietków', 9, 'Przykładowy wpis — powiąż z player_id w UI.'),
    (v_club_id, v_comp_b, v_season_2526, 'Nowak P.', 'GLKS Mietków', 1, NULL);

  UPDATE public.league_sources SET last_sync_at = v_snapshot WHERE id = v_src_csv;
END $$;
