-- ─────────────────────────────────────────────────────────────────
-- 002_enable_rls_mock.sql
-- Adds Row-Level Security to the new mock-exam tables introduced
-- in the relaunch (mock_papers, mock_attempts).
-- Mirrors the pattern in 001_enable_rls.sql.
-- Idempotent: safe to re-run.
-- ─────────────────────────────────────────────────────────────────

alter table public.mock_attempts enable row level security;
alter table public.mock_papers   enable row level security;

-- ── mock_attempts ────────────────────────────────────────────────
-- Users can only see / create / update their own attempts.
-- The service role bypasses RLS and is what the server actions use,
-- so persistence still works through lib/data/attempts.ts.

drop policy if exists "Service role full access to mock_attempts" on public.mock_attempts;
create policy "Service role full access to mock_attempts"
  on public.mock_attempts for all
  using (auth.role() = 'service_role');

drop policy if exists "Users read own mock_attempts via anon key" on public.mock_attempts;
create policy "Users read own mock_attempts via anon key"
  on public.mock_attempts for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own mock_attempts via anon key" on public.mock_attempts;
create policy "Users insert own mock_attempts via anon key"
  on public.mock_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own mock_attempts via anon key" on public.mock_attempts;
create policy "Users update own mock_attempts via anon key"
  on public.mock_attempts for update
  using (auth.uid() = user_id);

-- ── mock_papers ──────────────────────────────────────────────────
-- Papers are catalogue data — every authenticated user (and guests)
-- need to read them to render the picker / start a mock. Writes are
-- only ever performed by server-side code through the service role,
-- so no anon-key insert/update/delete policy is created here.

drop policy if exists "Service role full access to mock_papers" on public.mock_papers;
create policy "Service role full access to mock_papers"
  on public.mock_papers for all
  using (auth.role() = 'service_role');

drop policy if exists "Authenticated users read mock_papers via anon key" on public.mock_papers;
create policy "Authenticated users read mock_papers via anon key"
  on public.mock_papers for select
  using (auth.role() = 'authenticated');
