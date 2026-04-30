import Link from 'next/link';
import { requireUser } from '@/lib/auth/roles';

export default async function Dashboard() {
  const { user, supabase } = await requireUser();

  const fullName =
    typeof user.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.trim()
      : '';
  const greeting = fullName || user.email?.split('@')[0] || 'there';

  const { data: enrollmentsData } = await supabase
    .from('enrollments')
    .select(
      'track_id, enrolled_at, completed_at, certification_tracks!inner(id, code, title, slug, description)'
    )
    .eq('user_id', user.id);
  const enrollments = enrollmentsData ?? [];
  const trackIds = enrollments.map((e) => e.track_id);

  const lessonsPerTrack: Record<string, string[]> = {};
  const lessonMinutes: Record<string, number> = {};
  if (trackIds.length > 0) {
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('id, est_minutes, modules!inner(track_id)')
      .in('modules.track_id', trackIds);
    for (const row of lessonRows ?? []) {
      const mod = Array.isArray((row as { modules: unknown }).modules)
        ? ((row as { modules: { track_id: string }[] }).modules[0] ?? null)
        : ((row as { modules: { track_id: string } | null }).modules ?? null);
      const tid = mod?.track_id;
      if (!tid) continue;
      lessonsPerTrack[tid] = lessonsPerTrack[tid] || [];
      lessonsPerTrack[tid].push(row.id);
      lessonMinutes[row.id] = row.est_minutes ?? 0;
    }
  }

  const { data: progressData } = await supabase
    .from('progress')
    .select('lesson_id, status, updated_at, lessons!inner(id, title)')
    .eq('user_id', user.id);

  const completedLessonIds = new Set(
    (progressData ?? []).filter((p) => p.status === 'completed').map((p) => p.lesson_id)
  );

  const recent = (progressData ?? [])
    .slice()
    .sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0];
  const recentLesson = recent
    ? Array.isArray(recent.lessons)
      ? recent.lessons[0]
      : (recent.lessons as { id: string; title: string } | null)
    : null;

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select('passed, status')
    .eq('user_id', user.id)
    .eq('status', 'submitted');
  const submitted = attempts ?? [];
  const passedCount = submitted.filter((a) => a.passed).length;
  const passRate =
    submitted.length > 0 ? Math.round((passedCount / submitted.length) * 100) : null;

  const lessonsCompleted = completedLessonIds.size;
  const minutesSpent = Array.from(completedLessonIds).reduce(
    (sum, id) => sum + (lessonMinutes[id] ?? 0),
    0
  );
  const hoursSpent = Math.round((minutesSpent / 60) * 10) / 10;

  return (
    <div className="space-y-8 p-6">
      <section className="rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 p-8 text-white">
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome back, {greeting}
        </h1>
        <p className="mt-2 max-w-xl text-slate-300">
          Track your certification progress, jump into a lesson, or browse new tracks.
        </p>
        {recentLesson && (
          <Link
            href={`/lessons/${recentLesson.id}`}
            className="mt-5 inline-flex h-10 items-center rounded-md bg-white px-5 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Resume: {recentLesson.title}
          </Link>
        )}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Lessons completed" value={String(lessonsCompleted)} />
        <Stat
          label="Exam pass rate"
          value={passRate === null ? '—' : `${passRate}%`}
          sub={
            passRate === null
              ? 'No attempts yet'
              : `${passedCount}/${submitted.length} passed`
          }
        />
        <Stat label="Hours spent" value={String(hoursSpent)} sub={`${minutesSpent} min`} />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Your certifications</h2>
          <Link href="/tracks" className="text-sm text-slate-600 hover:underline">
            Browse all tracks →
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-600">
            You haven&apos;t enrolled in any certification tracks yet.{' '}
            <Link href="/tracks" className="text-slate-900 underline">
              Browse tracks
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {enrollments.map((e) => {
              const track = Array.isArray(e.certification_tracks)
                ? e.certification_tracks[0]
                : e.certification_tracks;
              if (!track) return null;
              const lessons = lessonsPerTrack[e.track_id] ?? [];
              const total = lessons.length;
              const done = lessons.filter((id) => completedLessonIds.has(id)).length;
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={e.track_id} className="rounded-lg border bg-white p-4">
                  <div className="font-mono text-xs text-slate-500">{track.code}</div>
                  <div className="mt-1 font-semibold">{track.title}</div>
                  {track.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {track.description}
                    </p>
                  )}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>
                        {done} / {total} lessons
                      </span>
                      <span>{pct}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-slate-900 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/tracks/${track.id}`}
                    className="mt-4 inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50"
                  >
                    Open track
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
