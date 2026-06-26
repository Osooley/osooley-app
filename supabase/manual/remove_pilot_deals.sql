-- Manual cleanup — RUN BY HAND in the Supabase SQL editor. NOT a migration.
-- Do NOT move this into supabase/migrations/ (see CLAUDE.md gotcha #3:
-- data scripts in migrations break the automated migration runs).
--
-- Removes the seeded pilot/demo deals (15901 Pythias Ave + 3401 Roanoke Ave)
-- that were seeded in 001_schema.sql. These rows have user_id = null, so RLS
-- already hides them from every user — this just deletes them physically for
-- cleanliness. properties has ON DELETE CASCADE, so deleting the two property
-- rows also removes their deal_tracker (and any analyses) rows automatically.
-- Idempotent: safe to run more than once.

delete from public.properties
where id in (
  'a0000000-0000-0000-0000-000000000001',  -- 15901 Pythias Ave (44110)
  'a0000000-0000-0000-0000-000000000002'   -- 3401 Roanoke Ave (44109)
);
