-- ETAP 15B seed: League Hub — Piorun Wawrzeńczyce / GLKS Mietków

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
  VALUES
    (v_comp_b, v_club_id, v_season_2526, 'B Klasa', 'Seniorzy', 'DZPN',
      'Rozgrywki amatorskie — import CSV/JSON, bez nieautoryzowanego pobierania PZPN/DZPN.', TRUE);

  INSERT INTO public.league_sources (id, club_id, competition_id, name, adapter, provider_label, is_active, config)
  VALUES
    (v_src_csv, v_club_id, v_comp_b, 'Tabela B Klasy — CSV', 'csv', 'DZPN', TRUE,
      '{"note":"Import ręczny tabeli z portalu DZPN (eksport CSV)."}'::jsonb),
    (v_src_json, v_club_id, v_comp_b, 'Terminarz — JSON lokalny', 'json', 'DZPN', TRUE,
      '{"note":"Terminarz przygotowany lokalnie przez administratora."}'::jsonb),
    (v_src_api, v_club_id, v_comp_b, 'FutureApiAdapter — PZPN', 'api', 'PZPN', FALSE,
      '{"note":"Placeholder pod oficjalne API — obecnie niedostępne."}'::jsonb);

  INSERT INTO public.league_teams (club_id, competition_id, team_id, display_name, league_name, external_id, is_own_club, provider, notes)
  VALUES
    (v_club_id, v_comp_b, v_team_senior, 'Piorun Wawrzeńczyce', 'GLKS Mietków', 'DZPN-CLUB-4821', TRUE, 'DZPN',
      'Nazwa brandingowa vs nazwa ligowa w rozgrywkach.'),
    (v_club_id, v_comp_b, NULL, 'KS Dolina', 'KS Dolina', 'DZPN-T-101', FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'LKS Orzeł', 'LKS Orzeł', 'DZPN-T-102', FALSE, 'DZPN', NULL),
    (v_club_id, v_comp_b, NULL, 'UKH Wiry', 'UKH Wiry', 'DZPN-T-103', FALSE, 'DZPN', NULL);

  INSERT INTO public.league_tables (
    club_id, competition_id, season_id, source_id, snapshot_at,
    team_name, position, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, is_own_club
  )
  VALUES
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'KS Dolina', 1, 8, 6, 1, 1, 18, 8, 10, 19, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'GLKS Mietków', 2, 8, 5, 2, 1, 15, 9, 6, 17, TRUE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'LKS Orzeł', 3, 8, 4, 2, 2, 12, 11, 1, 14, FALSE),
    (v_club_id, v_comp_b, v_season_2526, v_src_csv, v_snapshot, 'UKH Wiry', 4, 8, 2, 1, 5, 9, 16, -7, 7, FALSE);

  INSERT INTO public.league_matches (
    club_id, competition_id, season_id, source_id, external_key,
    round_number, match_date, match_time, home_team_name, away_team_name,
    home_score, away_score, status, sync_status
  )
  VALUES
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2025-r1-mietkow-dolina',
      1, CURRENT_DATE - 21, '15:00', 'GLKS Mietków', 'KS Dolina', 2, 2, 'completed', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2025-r2-orzel-mietkow',
      2, CURRENT_DATE - 14, '15:00', 'LKS Orzeł', 'GLKS Mietków', 1, 3, 'completed', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2025-r3-mietkow-wiry',
      3, CURRENT_DATE - 7, '15:00', 'GLKS Mietków', 'UKH Wiry', 2, 0, 'completed', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2025-r4-dolina-mietkow',
      4, CURRENT_DATE + 7, '15:00', 'KS Dolina', 'GLKS Mietków', NULL, NULL, 'scheduled', 'pending'),
    (v_club_id, v_comp_b, v_season_2526, v_src_json, 'fix-2025-r5-mietkow-orzel',
      5, CURRENT_DATE + 14, '15:00', 'GLKS Mietków', 'LKS Orzeł', NULL, NULL, 'scheduled', 'pending');

  INSERT INTO public.league_sync_jobs (
    id, club_id, source_id, competition_id, import_type, status,
    records_processed, records_failed, records_conflicts, started_at, completed_at, metadata
  )
  VALUES (
    v_job_ok, v_club_id, v_src_csv, v_comp_b, 'league_table', 'completed',
    4, 0, 0, v_snapshot, v_snapshot + INTERVAL '2 minutes',
    '{"note":"Seed ETAP 15B — przykładowa synchronizacja tabeli."}'::jsonb
  );

  INSERT INTO public.league_sync_logs (job_id, club_id, level, message)
  VALUES
    (v_job_ok, v_club_id, 'info', 'Zaimportowano tabelę: 4 drużyny.'),
    (v_job_ok, v_club_id, 'info', 'Gotowe do synchronizacji z modułem Mecze.');

  INSERT INTO public.league_player_registry (club_id, competition_id, season_id, league_player_name, league_team_name, jersey_number, notes)
  VALUES
    (v_club_id, v_comp_b, v_season_2526, 'Kowalski J.', 'GLKS Mietków', 9, 'Przykładowy wpis — powiąż z player_id w UI.'),
    (v_club_id, v_comp_b, v_season_2526, 'Nowak P.', 'GLKS Mietków', 1, NULL);

  UPDATE public.league_sources SET last_sync_at = v_snapshot WHERE id = v_src_csv;
END $$;
