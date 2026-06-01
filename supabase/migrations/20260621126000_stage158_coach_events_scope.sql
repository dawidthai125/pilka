-- ETAP 15.8 — coach scoped events (hide sponsor meetings from coach)

DROP POLICY IF EXISTS crm_events_select ON public.crm_events;

CREATE POLICY crm_events_select ON public.crm_events FOR SELECT TO authenticated
  USING (
    club_id IN (SELECT public.user_club_ids())
    AND (
      public.actor_can_manage_crm(club_id)
      OR (
        public.user_has_club_role(club_id, ARRAY['coach']::public.club_role[])
        AND event_type IN ('tournament', 'club_picnic', 'parent_meeting', 'other')
      )
      OR EXISTS (
        SELECT 1 FROM public.crm_event_attendees ea
        WHERE ea.event_id = id
          AND (
            ea.profile_id = auth.uid()
            OR ea.contact_id IN (SELECT public.actor_crm_portal_contact_ids(club_id))
          )
      )
    )
  );
