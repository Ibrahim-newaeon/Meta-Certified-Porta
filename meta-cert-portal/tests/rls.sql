-- ============================================================
-- tests/rls.sql — Verify the three RLS guarantees
--
-- Run with: pnpm exec supabase db execute -f tests/rls.sql
--
-- The three guarantees this script proves:
--   1. A learner cannot read another learner's progress.
--   2. A learner cannot read quiz_question_options.is_correct.
--   3. A non-enrolled user cannot read a published track's resources.
--
-- Strategy: create two synthetic auth users, seed minimal data with
-- service-role privileges, then switch to each user's JWT context via
-- set_config('request.jwt.claims', ...) and assert the expected results.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- Synthetic users
-- ------------------------------------------------------------
do $$
declare
  v_alice uuid := '11111111-1111-1111-1111-111111111111';
  v_bob   uuid := '22222222-2222-2222-2222-222222222222';
begin
  -- Bypass auth.users by inserting directly (test-only)
  insert into auth.users (id, email, instance_id, aud, role, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values
    (v_alice, 'alice@test.local', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '{}', '{}', now(), now()),
    (v_bob,   'bob@test.local',   '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', '{}', '{}', now(), now())
  on conflict (id) do nothing;
end $$;

-- ------------------------------------------------------------
-- Seed: a published track with a module + lesson + pdf resource.
-- A quiz with one question and one (correct) option.
-- Alice is enrolled. Bob is NOT enrolled.
-- ------------------------------------------------------------
do $$
declare
  v_alice uuid := '11111111-1111-1111-1111-111111111111';
  v_track uuid;
  v_module uuid;
  v_lesson uuid;
  v_quiz   uuid;
  v_q      uuid;
begin
  insert into public.certification_tracks (code, title, slug, is_published)
    values ('TEST1', 'Test Track', 'test-track-rls', true)
    returning id into v_track;

  insert into public.modules (track_id, title) values (v_track, 'M1') returning id into v_module;
  insert into public.lessons (module_id, title) values (v_module, 'L1') returning id into v_lesson;

  insert into public.resources (lesson_id, kind, title, url)
    values (v_lesson, 'link', 'External', 'https://example.com');

  insert into public.quizzes (lesson_id, title) values (v_lesson, 'Q1') returning id into v_quiz;
  insert into public.quiz_questions (quiz_id, kind, prompt) values (v_quiz, 'single', 'pick one') returning id into v_q;
  insert into public.quiz_question_options (question_id, label, is_correct, order_index)
    values (v_q, 'right', true, 0), (v_q, 'wrong', false, 1);

  insert into public.enrollments (user_id, track_id) values (v_alice, v_track);

  -- Alice has progress on the lesson, Bob does not
  insert into public.progress (user_id, lesson_id, status, last_position)
    values (v_alice, v_lesson, 'in_progress', 5);
end $$;

-- ============================================================
-- GUARANTEE 1: Bob cannot read Alice's progress
-- ============================================================
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}',
  true
);

do $$
declare
  v_count int;
begin
  select count(*) into v_count
  from public.progress
  where user_id = '11111111-1111-1111-1111-111111111111';

  if v_count <> 0 then
    raise exception 'GUARANTEE 1 FAILED: Bob saw % progress rows for Alice', v_count;
  end if;
  raise notice 'GUARANTEE 1 PASS: Bob cannot read Alice''s progress';
end $$;

-- ============================================================
-- GUARANTEE 2: Bob cannot read quiz_question_options.is_correct
-- (he can read other columns of options he's allowed to see, but the
-- column-level revoke must hide is_correct.)
-- We assert that selecting `is_correct` raises a permission error.
-- ============================================================
do $$
declare
  v_caught boolean := false;
begin
  begin
    perform is_correct from public.quiz_question_options limit 1;
  exception when insufficient_privilege then
    v_caught := true;
  end;

  if not v_caught then
    raise exception 'GUARANTEE 2 FAILED: is_correct was readable to authenticated user';
  end if;
  raise notice 'GUARANTEE 2 PASS: is_correct is not readable by authenticated';
end $$;

-- ============================================================
-- GUARANTEE 3: Bob (not enrolled) cannot read resources
-- of the published track.
-- ============================================================
do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.resources;
  if v_count <> 0 then
    raise exception 'GUARANTEE 3 FAILED: Bob saw % resource rows', v_count;
  end if;
  raise notice 'GUARANTEE 3 PASS: Non-enrolled user cannot read resources';
end $$;

-- ============================================================
-- Sanity check: Alice (enrolled) CAN read the resource
-- ============================================================
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}',
  true
);

do $$
declare
  v_count int;
begin
  select count(*) into v_count from public.resources;
  if v_count = 0 then
    raise exception 'SANITY FAILED: Alice could not read resources she is enrolled in';
  end if;
  raise notice 'SANITY PASS: Alice can read enrolled resources (% rows)', v_count;
end $$;

rollback;  -- Test data is cleaned up; do not commit
