-- ETAP 4: Seed sezonu B Klasa — 12 drużyn, 20 meczów, statystyki, tabela

DO $$
DECLARE
  v_club_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  v_team_id UUID := 'b2c3d4e5-f6a7-8901-bcde-f12345678901';
  v_coach_id UUID;
  v_competition TEXT := 'B Klasa';
  v_season TEXT := '2025/2026';
  v_own_name TEXT := 'Piorun Wawrzeńczyce';
  v_match_id UUID;
  v_player RECORD;
  v_opponent TEXT;
  v_home TEXT;
  v_away TEXT;
  v_home_score INT;
  v_away_score INT;
  v_match_day DATE;
  v_round INT;
  v_starter_count INT;
  v_minute INT;
  v_mvp UUID;
  v_opponents TEXT[] := ARRAY[
    'Orzeł Mogilno', 'LKS Rożnowo', 'Grom Skarbimierzyce', 'Sparta Dobczyce',
    'Polonia Liszki', 'Victoria Świątniki', 'Start Brzeźnica', 'Wisła Spytkowice',
    'Unia Zabierzów', 'Górnik Alwernia', 'MKS Libiąż'
  ];
  v_league_teams TEXT[] := ARRAY[
    'Piorun Wawrzeńczyce', 'Orzeł Mogilno', 'LKS Rożnowo', 'Grom Skarbimierzyce',
    'Sparta Dobczyce', 'Polonia Liszki', 'Victoria Świątniki', 'Start Brzeźnica',
    'Wisła Spytkowice', 'Unia Zabierzów', 'Górnik Alwernia', 'MKS Libiąż'
  ];
  i INT;
  j INT;
BEGIN
  SELECT id INTO v_coach_id FROM public.profiles WHERE email = 'trener@piorun.test' LIMIT 1;

  DELETE FROM public.match_mvp_history WHERE club_id = v_club_id;
  DELETE FROM public.match_player_stats WHERE club_id = v_club_id;
  DELETE FROM public.match_events WHERE club_id = v_club_id;
  DELETE FROM public.match_lineup_positions WHERE club_id = v_club_id;
  DELETE FROM public.match_squad WHERE club_id = v_club_id;
  DELETE FROM public.matches WHERE club_id = v_club_id;
  DELETE FROM public.league_table_entries WHERE club_id = v_club_id;

  FOR i IN 1..array_length(v_league_teams, 1) LOOP
    INSERT INTO public.league_table_entries (
      club_id, competition, season, team_name,
      played, won, drawn, lost, goals_for, goals_against, points,
      is_own_club, sort_order
    ) VALUES (
      v_club_id, v_competition, v_season, v_league_teams[i],
      CASE WHEN v_league_teams[i] = v_own_name THEN 20 ELSE 18 + (i % 3) END,
      CASE WHEN v_league_teams[i] = v_own_name THEN 12 ELSE 5 + (i % 4) END,
      CASE WHEN v_league_teams[i] = v_own_name THEN 4 ELSE 3 + (i % 2) END,
      CASE WHEN v_league_teams[i] = v_own_name THEN 4 ELSE 6 + (i % 3) END,
      CASE WHEN v_league_teams[i] = v_own_name THEN 38 ELSE 20 + i * 2 END,
      CASE WHEN v_league_teams[i] = v_own_name THEN 22 ELSE 18 + i END,
      CASE WHEN v_league_teams[i] = v_own_name THEN 40 ELSE 18 + i * 2 END,
      v_league_teams[i] = v_own_name,
      i
    );
  END LOOP;

  v_match_day := DATE '2025-08-17';
  FOR i IN 1..20 LOOP
    v_opponent := v_opponents[((i - 1) % array_length(v_opponents, 1)) + 1];
    v_round := i;

    IF i % 2 = 1 THEN
      v_home := v_own_name;
      v_away := v_opponent;
      v_home_score := 1 + (abs(hashtext(v_opponent || i::TEXT)) % 3);
      v_away_score := abs(hashtext(v_opponent || i::TEXT || 'a')) % 2;
    ELSE
      v_home := v_opponent;
      v_away := v_own_name;
      v_away_score := 1 + (abs(hashtext(v_opponent || i::TEXT)) % 2);
      v_home_score := abs(hashtext(v_opponent || i::TEXT || 'b')) % 2;
    END IF;

    INSERT INTO public.matches (
      club_id, team_id, competition, season, round_number,
      match_date, match_time, home_team_name, away_team_name,
      stadium, stadium_address, status, home_score, away_score,
      formation, coach_notes
    ) VALUES (
      v_club_id, v_team_id, v_competition, v_season, v_round,
      v_match_day, TIME '16:00',
      v_home, v_away,
      CASE WHEN v_home = v_own_name THEN 'Stadion Wawrzeńczyce' ELSE 'Stadion wyjazdowy' END,
      CASE WHEN v_home = v_own_name THEN 'Wawrzeńczyce, ul. Sportowa 1' ELSE NULL END,
      'completed'::public.match_status,
      v_home_score, v_away_score,
      (ARRAY['4-4-2','4-3-3','3-5-2','4-2-3-1'])[1 + (i % 4)],
      'Mecz ligowy B Klasa — sezon 2025/2026.'
    )
    RETURNING id INTO v_match_id;

    v_starter_count := 0;
    FOR v_player IN
      SELECT id FROM public.players
      WHERE club_id = v_club_id AND team_id = v_team_id
      ORDER BY last_name, first_name
    LOOP
      INSERT INTO public.match_squad (club_id, match_id, player_id, squad_role)
      VALUES (
        v_club_id, v_match_id, v_player.id,
        CASE
          WHEN v_starter_count < 11 THEN 'starter'::public.match_squad_role
          WHEN v_starter_count < 16 THEN 'substitute'::public.match_squad_role
          ELSE 'squad'::public.match_squad_role
        END
      );
      v_starter_count := v_starter_count + 1;
    END LOOP;

    SELECT id INTO v_mvp FROM public.players
    WHERE club_id = v_club_id AND team_id = v_team_id
    ORDER BY abs(hashtext(id::TEXT || v_match_id::TEXT))
    LIMIT 1;

    UPDATE public.matches SET mvp_player_id = v_mvp WHERE id = v_match_id;

    INSERT INTO public.match_mvp_history (club_id, match_id, player_id, selected_by)
    VALUES (v_club_id, v_match_id, v_mvp, v_coach_id);

    FOR v_player IN
      SELECT ms.player_id, ms.squad_role
      FROM public.match_squad ms
      WHERE ms.match_id = v_match_id AND ms.squad_role IN ('starter', 'substitute')
      LIMIT 14
    LOOP
      INSERT INTO public.match_player_stats (
        club_id, match_id, player_id, minutes_played, goals, assists,
        yellow_cards, red_cards, is_starter
      ) VALUES (
        v_club_id, v_match_id, v_player.player_id,
        CASE WHEN v_player.squad_role = 'starter'::public.match_squad_role THEN 70 + (abs(hashtext(v_player.player_id::TEXT)) % 21) ELSE 10 + (abs(hashtext(v_player.player_id::TEXT)) % 30) END,
        CASE WHEN abs(hashtext(v_player.player_id::TEXT || v_match_id::TEXT)) % 15 = 0 THEN 1 ELSE 0 END,
        CASE WHEN abs(hashtext(v_player.player_id::TEXT || v_match_id::TEXT || 'as')) % 20 = 0 THEN 1 ELSE 0 END,
        CASE WHEN abs(hashtext(v_player.player_id::TEXT || v_match_id::TEXT || 'y')) % 25 = 0 THEN 1 ELSE 0 END,
        CASE WHEN abs(hashtext(v_player.player_id::TEXT || v_match_id::TEXT || 'r')) % 80 = 0 THEN 1 ELSE 0 END,
        v_player.squad_role = 'starter'::public.match_squad_role
      );
    END LOOP;

    v_minute := 12 + (abs(hashtext(v_match_id::TEXT)) % 60);
    INSERT INTO public.match_events (club_id, match_id, event_type, minute, player_id, created_by)
    SELECT v_club_id, v_match_id, 'goal'::public.match_event_type, v_minute, mps.player_id, v_coach_id
    FROM public.match_player_stats mps
    WHERE mps.match_id = v_match_id AND mps.goals > 0
    LIMIT 1;

    INSERT INTO public.match_events (club_id, match_id, event_type, minute, player_id, related_player_id, created_by)
    SELECT v_club_id, v_match_id, 'assist'::public.match_event_type, v_minute, mps.player_id, v_mvp, v_coach_id
    FROM public.match_player_stats mps
    WHERE mps.match_id = v_match_id AND mps.assists > 0
    LIMIT 1;

    v_match_day := v_match_day + 7;
  END LOOP;

  INSERT INTO public.matches (
    club_id, team_id, competition, season, round_number,
    match_date, match_time, home_team_name, away_team_name,
    stadium, stadium_address, status, formation
  ) VALUES (
    v_club_id, v_team_id, v_competition, v_season, 21,
    v_match_day + 7, TIME '16:00',
    v_own_name, v_opponents[1],
    'Stadion Wawrzeńczyce', 'Wawrzeńczyce, ul. Sportowa 1',
    'planned'::public.match_status, '4-4-2'
  );

  UPDATE public.player_stats ps SET
    matches_played = sub.cnt,
    goals = sub.goals,
    assists = sub.assists,
    yellow_cards = sub.yellows,
    red_cards = sub.reds,
    minutes_played = sub.mins
  FROM (
    SELECT
      mps.player_id,
      COUNT(*)::INT AS cnt,
      SUM(mps.goals)::INT AS goals,
      SUM(mps.assists)::INT AS assists,
      SUM(mps.yellow_cards)::INT AS yellows,
      SUM(mps.red_cards)::INT AS reds,
      SUM(mps.minutes_played)::INT AS mins
    FROM public.match_player_stats mps
    JOIN public.matches m ON m.id = mps.match_id
    WHERE m.club_id = v_club_id AND m.status = 'completed'
    GROUP BY mps.player_id
  ) sub
  WHERE ps.player_id = sub.player_id AND ps.club_id = v_club_id AND ps.season = v_season;
END $$;
