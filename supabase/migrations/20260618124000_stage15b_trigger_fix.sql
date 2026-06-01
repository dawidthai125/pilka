-- Fix: nested IF for table-specific NEW fields (PL/pgSQL evaluates AND operands on all trigger tables)

CREATE OR REPLACE FUNCTION public.enforce_league_child_club_consistency()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'league_competitions' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_sources' THEN
    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_sources';
    END IF;

  ELSIF TG_TABLE_NAME = 'league_teams' OR TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' OR TG_TABLE_NAME = 'league_tables' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id
        AND c.season_id = NEW.season_id
        AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not match competition season';
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_matches' THEN
    IF NEW.match_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.matches m
        WHERE m.id = NEW.match_id AND m.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'match_id does not belong to club_id';
      END IF;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'league_player_registry' THEN
    IF NEW.player_id IS NOT NULL THEN
      IF NOT EXISTS (
        SELECT 1 FROM public.players p
        WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
      ) THEN
        RAISE EXCEPTION 'player_id does not belong to club_id';
      END IF;
    END IF;

    IF NEW.competition_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_competitions c
      WHERE c.id = NEW.competition_id AND c.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'competition_id does not belong to club_id on league_player_registry';
    END IF;

    IF NEW.season_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.league_seasons s
      WHERE s.id = NEW.season_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'season_id does not belong to club_id on league_player_registry';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
