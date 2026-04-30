# 01 — Database Schema & RLS

## 1. Conventions

- All tables live in the `public` schema.
- Primary keys are `uuid` defaulting to `gen_random_uuid()`.
- Timestamps are `timestamptz` defaulting to `now()`.
- All FKs to `auth.users` cascade on delete.
- Every table has RLS enabled and explicit policies.
- A `profiles` row is created via trigger when a new `auth.users` row is inserted.

## 2. ER Overview (ASCII)

```
auth.users ──1:1── profiles ──┐
                              │
                              │ owner of
                              ▼
                          enrollments ──N:1── certification_tracks
                              │                       │
                              │                       │ 1:N
                              │                       ▼
                              │                    modules
                              │                       │ 1:N
                              │                       ▼
                              │                    lessons ──1:N── resources
                              │                       │                  │
                              │                       │                  │
                              │                       ▼                  │
                              │                    quizzes ──1:N── quiz_questions
                              │                       │                  │
                              │                       │                  ▼
                              │                       │           quiz_question_options
                              │                       ▼
                              └────────────► quiz_attempts ──1:N── quiz_answers
                              progress (per lesson)
                              ai_chat_sessions ──1:N── ai_chat_messages
```

## 3. Migration: `supabase/migrations/0001_init.sql`

See `supabase/migrations/0001_init.sql` for the full DDL. Tables: profiles, certification_tracks, modules, lessons, resources, enrollments, progress, quizzes, quiz_questions, quiz_question_options, quiz_attempts, quiz_answers, ai_chat_sessions, ai_chat_messages.

## 4. Helper functions

See `supabase/migrations/0002_functions.sql`:

- `public.is_admin()` — returns true if `auth.uid()` has `role='admin'` in `profiles`.
- `public.is_enrolled_in_lesson(lesson_id)` — returns true if the caller is enrolled in the track that owns the lesson.

Both are `security definer` so they can read `profiles` and `enrollments` from inside RLS policies on other tables without recursive permission failures.

## 5. RLS Policies — every table

See `supabase/migrations/0003_rls.sql`. Highlights:

- `profiles` — self-read/update, admins read/update all. Update policy includes a `with check` that prevents a learner from elevating their own role.
- `certification_tracks` / `modules` / `lessons` — public read when track is published; admin-only write.
- `resources` — read gated by `is_enrolled_in_lesson()` so a non-enrolled learner can't even see storage paths or playback IDs.
- `enrollments` — learner can self-insert/self-delete; admins can update.
- `progress`, `quiz_attempts`, `quiz_answers`, `ai_chat_*` — strict self-only reads/writes, with `with check (user_id = auth.uid())`.
- `quiz_question_options.is_correct` — column-level grant **revoked** from `authenticated` and `anon`. Only the service role (server actions during grading) can read it.

## 6. Storage buckets

See `supabase/migrations/0004_storage.sql`:

- `resource-pdfs` — private. No SELECT policy for `authenticated`; reads happen exclusively via service-role-signed URLs.
- `track-covers` — public for learner-facing imagery.

## 7. Seed

See `supabase/seed.sql` for the six certification tracks (MCDMA, MCMBP, MCMSP, MCCM, MCCSP, MCMDA).

## Claude Project Prompt

> Using `01-database-schema.md` and the SQL files in `supabase/migrations/` + `supabase/seed.sql`, walk through each table and its RLS policies. After running `pnpm db:migrate` + `pnpm db:reset`, execute `tests/rls.sql` and report which assertions passed/failed. The three RLS guarantees that MUST hold: (1) a learner cannot read another learner's progress, (2) a learner cannot read `quiz_question_options.is_correct`, (3) a non-enrolled user cannot read a published track's resources.
