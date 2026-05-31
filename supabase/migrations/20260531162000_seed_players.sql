-- ETAP 2: Seed 25 zawodników seniorów — Piorun Wawrzeńczyce

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_team_id UUID := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  v_player_id UUID;
BEGIN
  -- Usuń poprzednie dane testowe modułu (idempotentny seed)
  DELETE FROM public.player_coach_notes WHERE club_id = v_club_id;
  DELETE FROM public.player_injuries WHERE club_id = v_club_id;
  DELETE FROM public.player_club_history WHERE club_id = v_club_id;
  DELETE FROM public.player_stats WHERE club_id = v_club_id;
  DELETE FROM public.player_documents WHERE club_id = v_club_id;
  DELETE FROM public.players WHERE club_id = v_club_id;

  INSERT INTO public.players (
    id, club_id, team_id, first_name, last_name, date_of_birth,
    phone, email, address, city, postal_code,
    jersey_number, primary_position, secondary_position, dominant_foot,
    height_cm, weight_kg, status, joined_at
  ) VALUES
    ('c1000001-0000-4000-8000-000000000001', v_club_id, v_team_id, 'Michał', 'Kowalski', '1995-03-12', '600100101', 'm.kowalski@piorun.test', 'ul. Sportowa 1', 'Wawrzeńczyce', '55-020', 1, 'goalkeeper', NULL, 'right', 188, 82.5, 'active', '2023-07-01'),
    ('c1000001-0000-4000-8000-000000000002', v_club_id, v_team_id, 'Piotr', 'Nowak', '1998-06-22', '600100102', 'p.nowak@piorun.test', 'ul. Leśna 5', 'Wawrzeńczyce', '55-020', 2, 'defender', 'midfielder', 'right', 183, 78.0, 'active', '2022-08-15'),
    ('c1000001-0000-4000-8000-000000000003', v_club_id, v_team_id, 'Tomasz', 'Wiśniewski', '1996-11-03', '600100103', 't.wisniewski@piorun.test', 'ul. Polna 8', 'Kąty Wrocławskie', '55-080', 3, 'defender', NULL, 'left', 185, 80.0, 'active', '2021-07-01'),
    ('c1000001-0000-4000-8000-000000000004', v_club_id, v_team_id, 'Krzysztof', 'Wójcik', '1999-01-18', '600100104', 'k.wojcik@piorun.test', 'ul. Słoneczna 2', 'Wawrzeńczyce', '55-020', 4, 'defender', NULL, 'right', 181, 76.5, 'injured', '2023-01-10'),
    ('c1000001-0000-4000-8000-000000000005', v_club_id, v_team_id, 'Adam', 'Kamiński', '1997-09-07', '600100105', 'a.kaminski@piorun.test', 'ul. Kwiatowa 14', 'Smolec', '55-080', 5, 'defender', 'midfielder', 'right', 182, 79.0, 'active', '2020-07-01'),
    ('c1000001-0000-4000-8000-000000000006', v_club_id, v_team_id, 'Marcin', 'Lewandowski', '2000-04-25', '600100106', 'm.lewandowski@piorun.test', 'ul. Parkowa 3', 'Wawrzeńczyce', '55-020', 6, 'midfielder', 'defender', 'both', 178, 74.0, 'active', '2024-01-15'),
    ('c1000001-0000-4000-8000-000000000007', v_club_id, v_team_id, 'Jakub', 'Zieliński', '1998-12-30', '600100107', 'j.zielinski@piorun.test', 'ul. Różana 7', 'Dobrzykowice', '55-020', 7, 'midfielder', NULL, 'right', 176, 72.0, 'active', '2022-07-01'),
    ('c1000001-0000-4000-8000-000000000008', v_club_id, v_team_id, 'Bartosz', 'Szymański', '1996-08-14', '600100108', 'b.szymanski@piorun.test', 'ul. Lipowa 11', 'Wawrzeńczyce', '55-020', 8, 'midfielder', 'forward', 'right', 177, 73.5, 'suspended', '2019-07-01'),
    ('c1000001-0000-4000-8000-000000000009', v_club_id, v_team_id, 'Damian', 'Woźniak', '2001-02-09', '600100109', 'd.wozniak@piorun.test', 'ul. Dębowa 6', 'Smolec', '55-080', 9, 'midfielder', NULL, 'left', 175, 71.0, 'active', '2023-08-01'),
    ('c1000001-0000-4000-8000-000000000010', v_club_id, v_team_id, 'Łukasz', 'Dąbrowski', '1999-05-21', '600100110', 'l.dabrowski@piorun.test', 'ul. Brzozowa 9', 'Wawrzeńczyce', '55-020', 10, 'midfielder', 'forward', 'right', 179, 75.0, 'active', '2021-07-01'),
    ('c1000001-0000-4000-8000-000000000011', v_club_id, v_team_id, 'Mateusz', 'Kozłowski', '1997-10-16', '600100111', 'm.kozlowski@piorun.test', 'ul. Akacjowa 4', 'Kąty Wrocławskie', '55-080', 11, 'forward', 'midfielder', 'right', 180, 77.0, 'active', '2020-07-01'),
    ('c1000001-0000-4000-8000-000000000012', v_club_id, v_team_id, 'Kamil', 'Jankowski', '2000-07-04', '600100112', 'k.jankowski@piorun.test', 'ul. Spacerowa 12', 'Wawrzeńczyce', '55-020', 12, 'forward', NULL, 'left', 184, 81.0, 'active', '2022-01-20'),
    ('c1000001-0000-4000-8000-000000000013', v_club_id, v_team_id, 'Rafał', 'Mazur', '1998-03-28', '600100113', 'r.mazur@piorun.test', 'ul. Wspólna 1', 'Wawrzeńczyce', '55-020', 13, 'forward', 'midfielder', 'right', 182, 78.5, 'inactive', '2018-07-01'),
    ('c1000001-0000-4000-8000-000000000014', v_club_id, v_team_id, 'Grzegorz', 'Krawczyk', '1996-12-11', '600100114', 'g.krawczyk@piorun.test', 'ul. Ogrodowa 15', 'Dobrzykowice', '55-020', 14, 'defender', NULL, 'right', 186, 83.0, 'active', '2017-07-01'),
    ('c1000001-0000-4000-8000-000000000015', v_club_id, v_team_id, 'Sebastian', 'Piotrowski', '1999-09-19', '600100115', 's.piotrowski@piorun.test', 'ul. Szkolna 2', 'Wawrzeńczyce', '55-020', 15, 'midfielder', NULL, 'right', 174, 70.0, 'active', '2023-07-01'),
    ('c1000001-0000-4000-8000-000000000016', v_club_id, v_team_id, 'Artur', 'Grabowski', '1997-04-02', '600100116', 'a.grabowski@piorun.test', 'ul. Młyńska 8', 'Smolec', '55-080', 16, 'defender', 'midfielder', 'right', 183, 79.5, 'active', '2019-07-01'),
    ('c1000001-0000-4000-8000-000000000017', v_club_id, v_team_id, 'Dawid', 'Pawłowski', '2001-11-25', '600100117', 'd.pawlowski@piorun.test', 'ul. Cicha 3', 'Wawrzeńczyce', '55-020', 17, 'midfielder', 'forward', 'both', 176, 72.5, 'active', '2024-07-01'),
    ('c1000001-0000-4000-8000-000000000018', v_club_id, v_team_id, 'Patryk', 'Michalski', '1998-08-08', '600100118', 'p.michalski@piorun.test', 'ul. Wierzbowa 10', 'Kąty Wrocławskie', '55-080', 18, 'forward', NULL, 'right', 181, 76.0, 'active', '2021-01-10'),
    ('c1000001-0000-4000-8000-000000000019', v_club_id, v_team_id, 'Hubert', 'Król', '1996-06-17', '600100119', 'h.krol@piorun.test', 'ul. Leśna 20', 'Wawrzeńczyce', '55-020', 19, 'goalkeeper', NULL, 'left', 190, 85.0, 'active', '2016-07-01'),
    ('c1000001-0000-4000-8000-000000000020', v_club_id, v_team_id, 'Maciej', 'Wieczorek', '2000-01-30', '600100120', 'm.wieczorek@piorun.test', 'ul. Polna 6', 'Wawrzeńczyce', '55-020', 20, 'defender', NULL, 'right', 184, 80.0, 'injured', '2022-07-01'),
    ('c1000001-0000-4000-8000-000000000021', v_club_id, v_team_id, 'Norbert', 'Jabłoński', '1999-07-13', '600100121', 'n.jablonski@piorun.test', 'ul. Sosnowa 5', 'Smolec', '55-080', 21, 'midfielder', 'defender', 'right', 177, 73.0, 'active', '2020-01-15'),
    ('c1000001-0000-4000-8000-000000000022', v_club_id, v_team_id, 'Wojciech', 'Malinowski', '1997-02-26', '600100122', 'w.malinowski@piorun.test', 'ul. Różana 18', 'Wawrzeńczyce', '55-020', 22, 'forward', 'midfielder', 'right', 179, 75.5, 'active', '2018-07-01'),
    ('c1000001-0000-4000-8000-000000000023', v_club_id, v_team_id, 'Filip', 'Olszewski', '2001-05-05', '600100123', 'f.olszewski@piorun.test', 'ul. Dębowa 1', 'Dobrzykowice', '55-020', 23, 'midfielder', NULL, 'left', 175, 71.5, 'active', '2023-01-01'),
    ('c1000001-0000-4000-8000-000000000024', v_club_id, v_team_id, 'Dominik', 'Adamczyk', '1998-10-20', '600100124', 'd.adamczyk@piorun.test', 'ul. Parkowa 7', 'Wawrzeńczyce', '55-020', 24, 'defender', NULL, 'right', 182, 78.0, 'active', '2021-07-01'),
    ('c1000001-0000-4000-8000-000000000025', v_club_id, v_team_id, 'Karol', 'Sikora', '1996-04-14', '600100125', 'k.sikora@piorun.test', 'ul. Spacerowa 4', 'Wawrzeńczyce', '55-020', 25, 'forward', NULL, 'right', 183, 79.0, 'active', '2015-07-01');

  -- Statystyki sezon 2025/2026
  INSERT INTO public.player_stats (club_id, player_id, season, matches_played, goals, assists, yellow_cards, red_cards, minutes_played)
  SELECT v_club_id, id, '2025/2026',
    (ABS(hashtext(id::TEXT)) % 12) + 1,
    (ABS(hashtext(id::TEXT || 'g')) % 8),
    (ABS(hashtext(id::TEXT || 'a')) % 5),
    (ABS(hashtext(id::TEXT || 'y')) % 4),
    (ABS(hashtext(id::TEXT || 'r')) % 2),
    ((ABS(hashtext(id::TEXT)) % 12) + 1) * 75
  FROM public.players WHERE club_id = v_club_id;

  -- Historia klubowa (przykłady)
  INSERT INTO public.player_club_history (club_id, player_id, event_type, event_date, description, related_club_name, previous_value, new_value)
  VALUES
    (v_club_id, 'c1000001-0000-4000-8000-000000000011', 'previous_club', '2019-06-30', 'Poprzedni klub przed transferem', 'GLKS Mietków', NULL, NULL),
    (v_club_id, 'c1000001-0000-4000-8000-000000000011', 'transfer_in', '2020-07-01', 'Dołączenie do Piorun Wawrzeńczyce', NULL, NULL, 'Seniorzy'),
    (v_club_id, 'c1000001-0000-4000-8000-000000000025', 'previous_club', '2014-06-30', 'Kariera w młodzieżówce', 'KS Wawrzeńczyce', NULL, NULL),
    (v_club_id, 'c1000001-0000-4000-8000-000000000025', 'jersey_number_change', '2018-07-01', 'Zmiana numeru', NULL, '9', '25');

  -- Kontuzje
  INSERT INTO public.player_injuries (club_id, player_id, injury_date, recovery_date, description, severity, is_active)
  VALUES
    (v_club_id, 'c1000001-0000-4000-8000-000000000004', CURRENT_DATE - 14, CURRENT_DATE + 21, 'Naderwanie mięśnia uda', 'moderate', TRUE),
    (v_club_id, 'c1000001-0000-4000-8000-000000000020', CURRENT_DATE - 3, CURRENT_DATE + 10, 'Skręcenie stawu skokowego', 'mild', TRUE),
    (v_club_id, 'c1000001-0000-4000-8000-000000000014', '2024-11-10', '2025-01-05', 'Złamanie kości śródstopia', 'severe', FALSE);

  -- Dokumenty (bez plików w storage — metadane do testów powiadomień)
  INSERT INTO public.player_documents (
    club_id, player_id, document_type, title, storage_path, file_name,
    mime_type, expires_at
  ) VALUES
    (v_club_id, 'c1000001-0000-4000-8000-000000000001', 'medical_exam', 'Badania lekarskie 2025', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/players/c1000001-0000-4000-8000-000000000001/documents/medical.pdf', 'medical.pdf', 'application/pdf', CURRENT_DATE + 7),
    (v_club_id, 'c1000001-0000-4000-8000-000000000002', 'insurance', 'Ubezpieczenie NNW', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/players/c1000001-0000-4000-8000-000000000002/documents/insurance.pdf', 'insurance.pdf', 'application/pdf', CURRENT_DATE + 14),
    (v_club_id, 'c1000001-0000-4000-8000-000000000003', 'parent_consent', 'Zgoda rodzica (archiwum)', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/players/c1000001-0000-4000-8000-000000000003/documents/consent.pdf', 'consent.pdf', 'application/pdf', CURRENT_DATE + 30),
    (v_club_id, 'c1000001-0000-4000-8000-000000000005', 'club_declaration', 'Deklaracja klubowa', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/players/c1000001-0000-4000-8000-000000000005/documents/declaration.pdf', 'declaration.pdf', 'application/pdf', CURRENT_DATE - 5),
    (v_club_id, 'c1000001-0000-4000-8000-000000000006', 'medical_exam', 'Badania lekarskie', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890/players/c1000001-0000-4000-8000-000000000006/documents/medical.pdf', 'medical.pdf', 'application/pdf', CURRENT_DATE + 60);

  -- Notatki trenerskie (przykłady)
  INSERT INTO public.player_coach_notes (club_id, player_id, author_id, note_type, content)
  SELECT
    v_club_id,
    'c1000001-0000-4000-8000-000000000007',
    p.id,
    'progress',
    'Wyraźna poprawa gry progresywną — więcej minut w drugiej połowie.'
  FROM public.profiles p
  WHERE p.email = 'trener@piorun.test'
  LIMIT 1;

END $$;
