-- ETAP 15.8 audit hardening

CREATE OR REPLACE FUNCTION public.enforce_crm_contact_player_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.player_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.players p
      WHERE p.id = NEW.player_id AND p.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'player_id does not belong to club_id';
    END IF;
  END IF;
  IF NEW.sponsor_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.sponsors s
      WHERE s.id = NEW.sponsor_id AND s.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'sponsor_id does not belong to club_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_contacts_enforce_refs
  BEFORE INSERT OR UPDATE ON public.crm_contacts
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_contact_player_club();

CREATE OR REPLACE FUNCTION public.enforce_crm_interaction_contact_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.crm_contacts c
    WHERE c.id = NEW.contact_id AND c.club_id = NEW.club_id
  ) THEN
    RAISE EXCEPTION 'contact_id does not belong to club_id';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_interactions_enforce_contact
  BEFORE INSERT OR UPDATE ON public.crm_interactions
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_interaction_contact_club();

CREATE OR REPLACE FUNCTION public.enforce_crm_donation_finance_club()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.finance_income_id IS NOT NULL AND to_regclass('public.finance_income') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.finance_income fi
      WHERE fi.id = NEW.finance_income_id AND fi.club_id = NEW.club_id
    ) THEN
      RAISE EXCEPTION 'finance_income_id does not belong to club_id';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER crm_donations_enforce_finance
  BEFORE INSERT OR UPDATE ON public.crm_donations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_crm_donation_finance_club();

CREATE INDEX IF NOT EXISTS crm_contacts_sponsor_pipeline_idx
  ON public.crm_contacts (club_id, contact_type, pipeline_status)
  WHERE contact_type IN ('sponsor', 'donor', 'company');

CREATE INDEX IF NOT EXISTS crm_tasks_open_due_idx
  ON public.crm_tasks (club_id, due_at)
  WHERE status = 'open';
