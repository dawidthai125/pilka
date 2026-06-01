-- ETAP 13.5 — performance indexes

CREATE INDEX IF NOT EXISTS idx_club_notifications_unread_user
  ON public.club_notifications (club_id, user_id, scheduled_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_training_attendance_club_player
  ON public.training_attendance (club_id, player_id);

CREATE INDEX IF NOT EXISTS idx_website_news_club_published
  ON public.website_news (club_id, published_at DESC)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_player_documents_expiring
  ON public.player_documents (club_id, expires_at)
  WHERE expires_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_club_memberships_staff
  ON public.club_memberships (club_id, role)
  WHERE status = 'active';
