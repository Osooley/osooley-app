-- Manual GRANT — RUN BY HAND in the Supabase SQL editor. NOT a migration.
--
-- Fixes "permission denied for table properties [42501]" when a user clicks
-- "Save to portfolio". The save flow inserts into properties / analyses /
-- deal_tracker from the browser as the `authenticated` role, but this project
-- has "auto-expose new tables = OFF" (see CLAUDE.md), so those tables were
-- never granted INSERT for that role. RLS still enforces per-row access
-- (every policy is `auth.uid() = user_id`); these grants only open the tables
-- at the SQL-privilege layer. Idempotent — safe to run more than once.

grant select, insert, update          on public.properties   to authenticated;
grant select, insert                  on public.analyses     to authenticated;
grant select, insert, update, delete  on public.deal_tracker to authenticated;
