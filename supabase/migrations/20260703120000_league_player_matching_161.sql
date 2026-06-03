-- Sprint 16.1: dopasowanie zawodników FC OS ↔ league_player_registry

CREATE TYPE public.league_player_match_status AS ENUM (
  'unmatched',
  'suggested',
  'auto_linked',
  'confirmed',
  'rejected'
);

ALTER TABLE public.league_player_registry
  ADD COLUMN match_status public.league_player_match_status NOT NULL DEFAULT 'unmatched',
  ADD COLUMN match_confidence SMALLINT,
  ADD COLUMN suggested_player_id UUID REFERENCES public.players (id) ON DELETE SET NULL;

ALTER TABLE public.league_player_registry
  ADD CONSTRAINT league_player_registry_match_confidence_check
  CHECK (match_confidence IS NULL OR (match_confidence >= 0 AND match_confidence <= 100));

CREATE INDEX league_player_registry_match_status_idx
  ON public.league_player_registry (club_id, match_status);

-- Istniejące powiązania traktuj jako auto-link (100%)
UPDATE public.league_player_registry
SET
  match_status = 'auto_linked',
  match_confidence = 100
WHERE player_id IS NOT NULL;
