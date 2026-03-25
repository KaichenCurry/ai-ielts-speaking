alter table public.practice_sessions
  add column if not exists review_result text not null default '',
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_at timestamptz null,
  add column if not exists appeal_note text not null default '',
  add column if not exists appealed_at timestamptz null,
  add column if not exists appeal_updated_at timestamptz null;

create table if not exists public.practice_sessions (
  id text primary key,
  part text not null,
  title text not null,
  question text not null,
  transcript text not null,
  duration_seconds integer not null default 0,
  total_score numeric not null,
  fluency_coherence numeric not null,
  lexical_resource numeric not null,
  grammar_score numeric not null,
  pronunciation numeric not null,
  completeness numeric not null,
  summary_feedback text not null,
  strengths jsonb not null,
  priorities jsonb not null,
  next_step text not null,
  sample_answer text,
  risk_flag boolean not null default false,
  risk_reason text not null default '',
  confidence text not null,
  provider text not null,
  model text not null,
  scoring_mode text not null,
  appeal_status text not null default 'none',
  appeal_note text not null default '',
  appealed_at timestamptz null,
  appeal_updated_at timestamptz null,
  review_status text not null default 'pending',
  review_result text not null default '',
  review_note text not null default '',
  reviewed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.prompt_versions (
  id text primary key,
  name text not null,
  description text not null,
  status text not null default 'archived',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.bad_cases (
  id text primary key,
  session_id text not null references public.practice_sessions(id) on delete cascade,
  prompt_version_id text null references public.prompt_versions(id),
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_created_at_idx
  on public.practice_sessions (created_at desc);

create index if not exists practice_sessions_part_idx
  on public.practice_sessions (part);

create index if not exists practice_sessions_risk_flag_idx
  on public.practice_sessions (risk_flag);

create index if not exists prompt_versions_status_idx
  on public.prompt_versions (status);

create index if not exists bad_cases_session_id_idx
  on public.bad_cases (session_id);
