-- ETAP 6 audit: RLS sponsorów, triggery spójności, RPC terminarza

-- Raporty: sponsor widzi wyłącznie opublikowane
DROP POLICY IF EXISTS "sponsor_reports_select" ON public.sponsor_reports;
CREATE POLICY "sponsor_reports_select" ON public.sponsor_reports FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
      AND status = 'published'
    )
  );

-- Publikacje: sponsor widzi wyłącznie powiązane z własnym rekordem
DROP POLICY IF EXISTS "sponsor_publications_select" ON public.sponsor_publications;
CREATE POLICY "sponsor_publications_select" ON public.sponsor_publications FOR SELECT TO authenticated
  USING (
    public.actor_can_read_sponsors(club_id)
    OR (
      public.actor_is_sponsor_user(club_id)
      AND EXISTS (
        SELECT 1 FROM public.sponsor_publication_links l
        WHERE l.publication_id = sponsor_publications.id
          AND l.club_id = sponsor_publications.club_id
          AND l.sponsor_id = public.sponsor_id_for_user(club_id, auth.uid())
      )
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsors_club_profile
  ON public.sponsors (club_id, profile_id)
  WHERE profile_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_sponsor_publication_link_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsor_publications p
    WHERE p.id = NEW.publication_id AND p.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'publication_id does not belong to club_id';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_publication_links_enforce_club ON public.sponsor_publication_links;
CREATE TRIGGER sponsor_publication_links_enforce_club
  BEFORE INSERT OR UPDATE OF publication_id, sponsor_id, club_id ON public.sponsor_publication_links
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_publication_link_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_contract_attachment_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsor_contracts c
    WHERE c.id = NEW.contract_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'contract_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_contract_attachments_enforce_club ON public.sponsor_contract_attachments;
CREATE TRIGGER sponsor_contract_attachments_enforce_club
  BEFORE INSERT OR UPDATE OF contract_id, club_id ON public.sponsor_contract_attachments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_contract_attachment_club_consistency();

CREATE OR REPLACE FUNCTION public.enforce_sponsor_financial_club_consistency()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.sponsors s
    WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'sponsor_id does not belong to club_id';
  END IF;
  IF NEW.contract_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.sponsor_contracts c
    WHERE c.id = NEW.contract_id AND c.club_id = NEW.club_id AND c.sponsor_id = NEW.sponsor_id
  ) THEN
    RAISE EXCEPTION 'contract_id does not belong to sponsor/club';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sponsor_financial_entries_enforce_club ON public.sponsor_financial_entries;
CREATE TRIGGER sponsor_financial_entries_enforce_club
  BEFORE INSERT OR UPDATE OF sponsor_id, contract_id, club_id ON public.sponsor_financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.enforce_sponsor_financial_club_consistency();

CREATE INDEX IF NOT EXISTS idx_sponsor_contracts_club_end_date
  ON public.sponsor_contracts (club_id, end_date)
  WHERE status IN ('active', 'expiring');

CREATE INDEX IF NOT EXISTS idx_sponsor_publications_club_published
  ON public.sponsor_publications (club_id, published_at DESC);

-- Terminarz/wyniki dla panelu sponsora (bez dostępu do danych zawodników)
CREATE OR REPLACE FUNCTION public.get_sponsor_portal_schedule(
  p_club_id UUID,
  p_team_id UUID
)
RETURNS JSONB
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'upcoming', COALESCE((
      SELECT jsonb_agg(row_to_json(u)::JSONB ORDER BY u.match_date, u.match_time)
      FROM (
        SELECT
          m.id,
          m.home_team_name,
          m.away_team_name,
          m.match_date,
          to_char(m.match_time, 'HH24:MI') AS match_time,
          m.status::TEXT AS status
        FROM public.matches m
        WHERE m.club_id = p_club_id
          AND m.team_id = p_team_id
          AND m.status = 'planned'
          AND m.match_date >= CURRENT_DATE
        ORDER BY m.match_date, m.match_time
        LIMIT 5
      ) u
    ), '[]'::JSONB),
    'results', COALESCE((
      SELECT jsonb_agg(row_to_json(r)::JSONB ORDER BY r.match_date DESC)
      FROM (
        SELECT
          m.id,
          m.home_team_name,
          m.away_team_name,
          m.home_score,
          m.away_score,
          m.match_date
        FROM public.matches m
        WHERE m.club_id = p_club_id
          AND m.team_id = p_team_id
          AND m.status = 'completed'
        ORDER BY m.match_date DESC
        LIMIT 5
      ) r
    ), '[]'::JSONB)
  )
  WHERE public.actor_is_sponsor_user(p_club_id);
$$;

GRANT EXECUTE ON FUNCTION public.get_sponsor_portal_schedule(UUID, UUID) TO authenticated;
