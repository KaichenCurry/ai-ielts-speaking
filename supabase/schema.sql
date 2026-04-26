create table if not exists public.practice_sessions (
  id text primary key,
  user_id uuid null references auth.users(id) on delete cascade,
  part text not null,
  topic_slug text not null,
  topic_title text not null,
  question_id text not null,
  question_text text not null,
  question_index integer null,
  question_label text not null,
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
  improved_answer text,
  dimension_feedback jsonb,
  pronunciation_focus jsonb,
  sample_answer_pronunciation jsonb,
  improved_answer_pronunciation jsonb,
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

alter table public.practice_sessions
  add column if not exists user_id uuid null references auth.users(id) on delete cascade,
  add column if not exists topic_slug text null,
  add column if not exists topic_title text null,
  add column if not exists question_id text null,
  add column if not exists question_text text null,
  add column if not exists question_index integer null,
  add column if not exists question_label text null,
  add column if not exists review_result text not null default '',
  add column if not exists review_note text not null default '',
  add column if not exists reviewed_at timestamptz null,
  add column if not exists appeal_note text not null default '',
  add column if not exists appealed_at timestamptz null,
  add column if not exists appeal_updated_at timestamptz null,
  add column if not exists improved_answer text null,
  add column if not exists dimension_feedback jsonb null,
  add column if not exists pronunciation_focus jsonb null,
  add column if not exists sample_answer_pronunciation jsonb null,
  add column if not exists improved_answer_pronunciation jsonb null;

-- Backfill defaults for any rows where the new columns are still null.
-- The legacy `title` / `question` columns (renamed in an earlier migration
-- to topic_title / question_text) are no longer assumed to exist; if you
-- still have them, copy values manually before running this script.
update public.practice_sessions
set
  topic_slug = coalesce(topic_slug, id),
  question_id = coalesce(question_id, id),
  question_label = coalesce(question_label, upper(part) || ' Prompt')
where
  topic_slug is null
  or question_id is null
  or question_label is null;

-- topic_title / question_text need values before being marked NOT NULL.
-- For any row still missing them, fall back to the question_id and a
-- generic title so the alter-column-not-null below succeeds.
update public.practice_sessions
set
  topic_title = coalesce(topic_title, 'Legacy session'),
  question_text = coalesce(question_text, question_id)
where
  topic_title is null
  or question_text is null;

alter table public.practice_sessions
  alter column topic_slug set not null,
  alter column topic_title set not null,
  alter column question_id set not null,
  alter column question_text set not null,
  alter column question_label set not null;

alter table public.practice_sessions
  drop column if exists title,
  drop column if exists question;

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

-- Questions table
-- Admin writes currently go through the server-side service-role client in app/api/questions.
-- If you later expose direct client reads/writes on this table, add explicit RLS policies here
-- instead of relying only on application-layer admin checks.
create table if not exists public.questions (
  id text primary key,
  part text not null,
  topic text not null,
  difficulty text not null default 'medium',
  question text not null,
  helper text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists practice_sessions_user_id_idx
  on public.practice_sessions (user_id);

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

create index if not exists questions_part_idx
  on public.questions (part);

create index if not exists questions_topic_idx
  on public.questions (topic);

create index if not exists questions_difficulty_idx
  on public.questions (difficulty);

create index if not exists questions_is_active_idx
  on public.questions (is_active);

-- Student-centric admin query indexes
create index if not exists practice_sessions_user_created_idx
  on public.practice_sessions (user_id, created_at desc);

create index if not exists practice_sessions_appeal_status_idx
  on public.practice_sessions (appeal_status);

create index if not exists practice_sessions_review_status_idx
  on public.practice_sessions (review_status);

-- ─── Mock exam (full speaking test) ──────────────────────────────
-- A mock_attempt represents one full Part1→Part2→Part3 sitting.
-- Each question answered inside the attempt is still persisted as a
-- practice_sessions row (with mock_attempt_id + section_index set), so
-- that admin review tooling continues to work at the per-question level.

create table if not exists public.mock_papers (
  id text primary key,
  season text not null,
  title text not null,
  part1_topic_slugs text[] not null default '{}',
  part23_topic_slug text not null,
  difficulty text not null default 'medium',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists mock_papers_season_idx
  on public.mock_papers (season);
create index if not exists mock_papers_active_idx
  on public.mock_papers (is_active);

create table if not exists public.mock_attempts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  paper_id text not null references public.mock_papers(id) on delete restrict,
  season text not null,
  status text not null default 'in_progress',
  started_at timestamptz not null default now(),
  submitted_at timestamptz null,
  scored_at timestamptz null,
  total_score numeric null,
  band_scores jsonb null,
  summary text null,
  resume_state jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists mock_attempts_user_idx
  on public.mock_attempts (user_id, created_at desc);
create index if not exists mock_attempts_status_idx
  on public.mock_attempts (status);
create index if not exists mock_attempts_paper_idx
  on public.mock_attempts (paper_id);

alter table public.practice_sessions
  add column if not exists mock_attempt_id text null
    references public.mock_attempts(id) on delete cascade,
  add column if not exists section_index integer null;

create index if not exists practice_sessions_mock_attempt_idx
  on public.practice_sessions (mock_attempt_id);
