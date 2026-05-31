-- Migration 018: Ensure realtime is enabled for messages
-- If the messages table isn't in the supabase_realtime publication, INSERT/
-- UPDATE/DELETE events never reach clients — so messages posted on one device
-- never appear on another (and the sender only sees them after a reload).
-- This adds the table to the publication if it isn't already there (idempotent).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.messages';
  END IF;
END $$;

-- REPLICA IDENTITY FULL (also set in migration 015) is required so realtime
-- DELETE/UPDATE payloads include the full old row. Re-assert it here in case
-- migration 015 was skipped.
ALTER TABLE public.messages REPLICA IDENTITY FULL;
