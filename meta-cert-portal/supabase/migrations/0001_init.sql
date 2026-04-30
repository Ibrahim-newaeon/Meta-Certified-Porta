-- ============================================================
-- 0001_init.sql — Tables, enums, and the auth.users trigger
-- ============================================================

create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- ============================================================
-- Enums
-- ============================================================
do $$ begin
  create type user_role as enum ('admin', 'learner');
exception when duplicate_object then null; end $$;

do $$ begin
  create type resource_kind as enum ('link', 'pdf', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type quiz_kind as enum ('practice', 'mock_exam');
exception when duplicate_object then null; end $$;

do $$ begin
  create type question_kind as enum ('single', 'multi', 'scenario');
exception when duplicate_object then null; end $$;

do $$ begin
  create type attempt_status as enum ('in_progress', 'submitted', 'expired');
exception when duplicate_object then null; end $$;

-- ============================================================
-- profiles  (1:1 with auth.users)
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        citext unique not null,
  full_name    text,
  avatar_url   text,
  role         user_role not null default 'learner',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Trigger: auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer  -- SECURITY: runs as table owner so it can write to profiles
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- certification_tracks
-- ============================================================
create table if not exists public.certification_tracks (
  id           uuid primary key default gen_random_uuid(),
  code         text unique not null,
  title        text not null,
  slug         text unique not null,
  description  text,
  cover_url    text,
  exam_minutes int  not null default 75,
  pass_score   int  not null default 70,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists certification_tracks_published_idx
  on public.certification_tracks (is_published);

-- ============================================================
-- modules  (Track → Module)
-- ============================================================
create table if not exists public.modules (
  id            uuid primary key default gen_random_uuid(),
  track_id      uuid not null references public.certification_tracks(id) on delete cascade,
  title         text not null,
  description   text,
  order_index   int  not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists modules_track_order_idx
  on public.modules (track_id, order_index);

-- ============================================================
-- lessons  (Module → Lesson)
-- ============================================================
create table if not exists public.lessons (
  id            uuid primary key default gen_random_uuid(),
  module_id     uuid not null references public.modules(id) on delete cascade,
  title         text not null,
  summary       text,
  order_index   int  not null default 0,
  est_minutes   int  default 10,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists lessons_module_order_idx
  on public.lessons (module_id, order_index);

-- ============================================================
-- resources  (Lesson → Resource, polymorphic)
-- ============================================================
create table if not exists public.resources (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons(id) on delete cascade,
  kind            resource_kind not null,
  title           text not null,
  order_index     int  not null default 0,

  -- kind = 'link'
  url             text,

  -- kind = 'pdf'
  storage_bucket  text,
  storage_path    text,
  page_count      int,
  extracted_text  text,

  -- kind = 'video'
  video_provider     text,
  video_asset_id     text,
  video_playback_id  text,
  video_duration_s   int,
  video_url          text,

  -- exam tagging
  exam_codes      text[] not null default '{}',

  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint resource_kind_fields check (
    (kind = 'link'  and url is not null) or
    (kind = 'pdf'   and storage_bucket is not null and storage_path is not null) or
    (kind = 'video' and (video_playback_id is not null or video_url is not null))
  )
);
create index if not exists resources_lesson_order_idx
  on public.resources (lesson_id, order_index);
create index if not exists resources_exam_codes_idx
  on public.resources using gin (exam_codes);

-- ============================================================
-- enrollments  (learner ↔ track)
-- ============================================================
create table if not exists public.enrollments (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  track_id      uuid not null references public.certification_tracks(id) on delete cascade,
  enrolled_at   timestamptz not null default now(),
  completed_at  timestamptz,
  unique (user_id, track_id)
);
create index if not exists enrollments_user_idx on public.enrollments (user_id);

-- ============================================================
-- progress  (per lesson, per user)
-- ============================================================
create table if not exists public.progress (
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_id     uuid not null references public.lessons(id) on delete cascade,
  status        text not null default 'in_progress',
  last_position int  default 0,
  updated_at    timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- ============================================================
-- quizzes / questions / options
-- ============================================================
create table if not exists public.quizzes (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid references public.lessons(id) on delete cascade,
  track_id        uuid references public.certification_tracks(id) on delete cascade,
  title           text not null,
  kind            quiz_kind not null default 'practice',
  exam_codes      text[] not null default '{}',
  time_limit_s    int,
  pass_score      int  not null default 70,
  question_count  int,
  shuffle         boolean not null default true,
  created_at      timestamptz not null default now(),
  constraint quiz_scope check (lesson_id is not null or track_id is not null)
);

create table if not exists public.quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  kind          question_kind not null,
  prompt        text not null,
  scenario      text,
  explanation   text,
  order_index   int  not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists quiz_questions_quiz_order_idx
  on public.quiz_questions (quiz_id, order_index);

create table if not exists public.quiz_question_options (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.quiz_questions(id) on delete cascade,
  label         text not null,
  is_correct    boolean not null default false,  -- SECURITY: column-level revoke in 0003_rls.sql
  order_index   int  not null default 0
);
create index if not exists quiz_question_options_question_order_idx
  on public.quiz_question_options (question_id, order_index);

-- ============================================================
-- quiz_attempts / quiz_answers
-- ============================================================
create table if not exists public.quiz_attempts (
  id            uuid primary key default gen_random_uuid(),
  quiz_id       uuid not null references public.quizzes(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  status        attempt_status not null default 'in_progress',
  started_at    timestamptz not null default now(),
  submitted_at  timestamptz,
  expires_at    timestamptz,
  score         numeric(5,2),
  passed        boolean
);
create index if not exists quiz_attempts_user_quiz_idx
  on public.quiz_attempts (user_id, quiz_id);

create table if not exists public.quiz_answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id         uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_ids uuid[] not null default '{}',
  is_correct          boolean,
  answered_at         timestamptz not null default now(),
  unique (attempt_id, question_id)
);

-- ============================================================
-- AI chat
-- ============================================================
create table if not exists public.ai_chat_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_id     uuid references public.lessons(id) on delete set null,
  title         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists ai_chat_sessions_user_idx
  on public.ai_chat_sessions (user_id, updated_at desc);

create table if not exists public.ai_chat_messages (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.ai_chat_sessions(id) on delete cascade,
  role          text not null check (role in ('user','assistant','system')),
  content       text not null,
  input_tokens  int,
  output_tokens int,
  created_at    timestamptz not null default now()
);
create index if not exists ai_chat_messages_session_idx
  on public.ai_chat_messages (session_id, created_at);

-- Daily usage view (consumed by the rate limiter)
create or replace view public.ai_usage_today as
select s.user_id,
       count(*) filter (where m.role = 'user') as turns_today,
       coalesce(sum(m.input_tokens),0) + coalesce(sum(m.output_tokens),0) as tokens_today
from public.ai_chat_messages m
join public.ai_chat_sessions s on s.id = m.session_id
where m.created_at >= date_trunc('day', now())
group by s.user_id;
