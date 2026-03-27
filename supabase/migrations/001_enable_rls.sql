-- Enable Row Level Security for all tables
alter table public.practice_sessions enable row level security;
alter table public.questions enable row level security;
alter table public.prompt_versions enable row level security;
alter table public.bad_cases enable row level security;

-- practice_sessions policies
-- Service role bypasses RLS, so app-layer filtering in lib/data/sessions.ts remains primary defense
-- These policies protect against direct anon-key access from client

create policy "Service role full access to practice_sessions"
  on public.practice_sessions for all
  using (auth.role() = 'service_role');

create policy "Users read own sessions via anon key"
  on public.practice_sessions for select
  using (auth.uid() = user_id);

create policy "Users insert own sessions via anon key"
  on public.practice_sessions for insert
  with check (auth.uid() = user_id);

-- questions policies
create policy "Service role full access to questions"
  on public.questions for all
  using (auth.role() = 'service_role');

create policy "Authenticated users read questions via anon key"
  on public.questions for select
  using (auth.role() = 'authenticated');

-- prompt_versions policies
create policy "Service role full access to prompt_versions"
  on public.prompt_versions for all
  using (auth.role() = 'service_role');

create policy "Authenticated users read prompt_versions via anon key"
  on public.prompt_versions for select
  using (auth.role() = 'authenticated');

-- bad_cases policies
create policy "Service role full access to bad_cases"
  on public.bad_cases for all
  using (auth.role() = 'service_role');
