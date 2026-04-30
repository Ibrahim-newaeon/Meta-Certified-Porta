-- ============================================================
-- 0002_functions.sql — RLS helper functions
-- ============================================================

-- Returns true if the calling user is admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer  -- SECURITY: definer to read profiles even when caller has no SELECT
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon, service_role;

-- Returns true if the user is enrolled in the track that contains <lesson_id>
create or replace function public.is_enrolled_in_lesson(p_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.lessons l
    join public.modules m on m.id = l.module_id
    join public.enrollments e on e.track_id = m.track_id
    where l.id = p_lesson and e.user_id = auth.uid()
  );
$$;

revoke all on function public.is_enrolled_in_lesson(uuid) from public;
grant execute on function public.is_enrolled_in_lesson(uuid) to authenticated, anon, service_role;
