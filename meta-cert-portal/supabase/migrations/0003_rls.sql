-- ============================================================
-- 0003_rls.sql — Row-Level Security policies for every table
-- ============================================================

-- ============================================================
-- profiles
-- ============================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_self_select" on public.profiles;
create policy "profiles_self_select" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_self_update" on public.profiles;
-- SECURITY: prevents a learner from elevating themselves to admin
create policy "profiles_self_update" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid()
              and role = (select role from public.profiles where id = auth.uid()));

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update" on public.profiles
  for update using (public.is_admin()) with check (public.is_admin());

-- No INSERT policy: rows are created exclusively by the on_auth_user_created trigger.
-- No DELETE policy: cascade from auth.users only.

-- ============================================================
-- certification_tracks
-- ============================================================
alter table public.certification_tracks enable row level security;

drop policy if exists "tracks_public_read" on public.certification_tracks;
create policy "tracks_public_read" on public.certification_tracks
  for select using (is_published or public.is_admin());

drop policy if exists "tracks_admin_write" on public.certification_tracks;
create policy "tracks_admin_write" on public.certification_tracks
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- modules
-- ============================================================
alter table public.modules enable row level security;

drop policy if exists "modules_read" on public.modules;
create policy "modules_read" on public.modules
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.certification_tracks t
      where t.id = modules.track_id and t.is_published
    )
  );

drop policy if exists "modules_admin_write" on public.modules;
create policy "modules_admin_write" on public.modules
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- lessons
-- ============================================================
alter table public.lessons enable row level security;

drop policy if exists "lessons_read" on public.lessons;
create policy "lessons_read" on public.lessons
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.modules m
      join public.certification_tracks t on t.id = m.track_id
      where m.id = lessons.module_id and t.is_published
    )
  );

drop policy if exists "lessons_admin_write" on public.lessons;
create policy "lessons_admin_write" on public.lessons
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- resources  (read-gated by enrollment for non-admins)
-- ============================================================
alter table public.resources enable row level security;

drop policy if exists "resources_read" on public.resources;
-- SECURITY: only enrolled learners (or admins) can read resource rows,
-- which prevents harvesting storage paths or video playback ids
create policy "resources_read" on public.resources
  for select using (
    public.is_admin() or public.is_enrolled_in_lesson(resources.lesson_id)
  );

drop policy if exists "resources_admin_write" on public.resources;
create policy "resources_admin_write" on public.resources
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- enrollments
-- ============================================================
alter table public.enrollments enable row level security;

drop policy if exists "enrollments_self_read" on public.enrollments;
create policy "enrollments_self_read" on public.enrollments
  for select using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_self_insert" on public.enrollments;
-- SECURITY: a learner can only enroll themselves
create policy "enrollments_self_insert" on public.enrollments
  for insert with check (user_id = auth.uid());

drop policy if exists "enrollments_self_delete" on public.enrollments;
create policy "enrollments_self_delete" on public.enrollments
  for delete using (user_id = auth.uid() or public.is_admin());

drop policy if exists "enrollments_admin_update" on public.enrollments;
create policy "enrollments_admin_update" on public.enrollments
  for update using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- progress
-- ============================================================
alter table public.progress enable row level security;

drop policy if exists "progress_self_rw" on public.progress;
-- SECURITY: with-check forbids writing progress rows for someone else
create policy "progress_self_rw" on public.progress
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

-- ============================================================
-- quizzes / quiz_questions / quiz_question_options
-- ============================================================
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_question_options enable row level security;

drop policy if exists "quizzes_read" on public.quizzes;
create policy "quizzes_read" on public.quizzes
  for select using (
    public.is_admin()
    or (lesson_id is not null and public.is_enrolled_in_lesson(lesson_id))
    or (track_id  is not null and exists (
        select 1 from public.enrollments e
        where e.track_id = quizzes.track_id and e.user_id = auth.uid()))
  );

drop policy if exists "quizzes_admin_write" on public.quizzes;
create policy "quizzes_admin_write" on public.quizzes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "qq_read" on public.quiz_questions;
create policy "qq_read" on public.quiz_questions
  for select using (
    public.is_admin() or exists (
      select 1 from public.quizzes q
      where q.id = quiz_questions.quiz_id
        and (
          (q.lesson_id is not null and public.is_enrolled_in_lesson(q.lesson_id))
          or (q.track_id is not null and exists (
              select 1 from public.enrollments e
              where e.track_id = q.track_id and e.user_id = auth.uid()))
        )
    )
  );

drop policy if exists "qq_admin_write" on public.quiz_questions;
create policy "qq_admin_write" on public.quiz_questions
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "qqo_read" on public.quiz_question_options;
create policy "qqo_read" on public.quiz_question_options
  for select using (
    public.is_admin() or exists (
      select 1 from public.quiz_questions qq
      join public.quizzes q on q.id = qq.quiz_id
      where qq.id = quiz_question_options.question_id
        and (
          (q.lesson_id is not null and public.is_enrolled_in_lesson(q.lesson_id))
          or (q.track_id is not null and exists (
              select 1 from public.enrollments e
              where e.track_id = q.track_id and e.user_id = auth.uid()))
        )
    )
  );

drop policy if exists "qqo_admin_write" on public.quiz_question_options;
create policy "qqo_admin_write" on public.quiz_question_options
  for all using (public.is_admin()) with check (public.is_admin());

-- SECURITY: revoke is_correct from anon/authenticated roles; only service_role
-- and admin (via the security-definer grading flow) may read it.
revoke select (is_correct) on public.quiz_question_options from authenticated, anon;

-- ============================================================
-- quiz_attempts / quiz_answers
-- ============================================================
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers  enable row level security;

drop policy if exists "attempts_self_rw" on public.quiz_attempts;
create policy "attempts_self_rw" on public.quiz_attempts
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "answers_self_rw" on public.quiz_answers;
create policy "answers_self_rw" on public.quiz_answers
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.quiz_attempts a
      where a.id = quiz_answers.attempt_id and a.user_id = auth.uid()
    )
  )
  with check (
    -- SECURITY: cannot edit answers after submit
    exists (
      select 1 from public.quiz_attempts a
      where a.id = quiz_answers.attempt_id
        and a.user_id = auth.uid()
        and a.status = 'in_progress'
    )
  );

-- ============================================================
-- AI chat
-- ============================================================
alter table public.ai_chat_sessions enable row level security;
alter table public.ai_chat_messages enable row level security;

drop policy if exists "chat_sessions_self_rw" on public.ai_chat_sessions;
create policy "chat_sessions_self_rw" on public.ai_chat_sessions
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid());

drop policy if exists "chat_messages_self_rw" on public.ai_chat_messages;
create policy "chat_messages_self_rw" on public.ai_chat_messages
  for all using (
    public.is_admin()
    or exists (
      select 1 from public.ai_chat_sessions s
      where s.id = ai_chat_messages.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.ai_chat_sessions s
      where s.id = ai_chat_messages.session_id and s.user_id = auth.uid()
    )
  );
