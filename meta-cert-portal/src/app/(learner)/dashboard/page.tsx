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

  const { data: publishedTracksData } = await supabase
    .from('certification_tracks')
    .select('id, code, title, slug, description, exam_minutes, pass_score')
    .eq('is_published', true)
    .order('code');
  const enrolledIds = new Set(trackIds);
  const availableTracks = (publishedTracksData ?? []).filter(
    (t) => !enrolledIds.has(t.id)
  );

  const lessonsPerTrack: Record<string, string[]> = {};
  const lessonMinutes: Record<string, number> = {};
  if (trackIds.length > 0) {
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('id, est_minutes, modules!inner(track_id)')
      .in('modules.track_id', trackIds);
    for (const row of lessonRows ?? []) {
      const rowModules = (row as { modules: unknown }).modules;
      const mod = Array.isArray(rowModules)
        ? ((rowModules[0] ?? null) as { track_id: string } | null)
        : (rowModules as { track_id: string } | null);
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 p-8 text-white shadow-sm">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-lime-300/20 blur-3xl" />
        <div className="relative">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back, {greeting}
          </h1>
          <p className="mt-2 max-w-xl text-emerald-100">
            Track your certification progress, jump into a lesson, or browse new tracks.
          </p>
          {recentLesson && (
            <Link
              href={`/lessons/${recentLesson.id}`}
              className="mt-5 inline-flex h-10 items-center rounded-md bg-white px-5 text-sm font-medium text-emerald-700 shadow-sm hover:bg-emerald-50"
            >
              Resume: {recentLesson.title}
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat
          label="Lessons completed"
          value={String(lessonsCompleted)}
          tone="emerald"
        />
        <Stat
          label="Exam pass rate"
          value={passRate === null ? '—' : `${passRate}%`}
          sub={
            passRate === null
              ? 'No attempts yet'
              : `${passedCount}/${submitted.length} passed`
          }
          tone="amber"
        />
        <Stat
          label="Hours spent"
          value={String(hoursSpent)}
          sub={`${minutesSpent} min`}
          tone="indigo"
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Your certifications</h2>
          <Link href="/tracks" className="text-sm text-emerald-700 hover:underline">
            Browse all tracks →
          </Link>
        </div>
        {enrollments.length === 0 ? (
          <div className="rounded-lg border bg-white p-6 text-center text-sm text-slate-600">
            You haven&apos;t enrolled in any certification tracks yet.{' '}
            <Link href="/tracks" className="text-emerald-700 underline">
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
                <div
                  key={e.track_id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
                >
                  <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                    {track.code}
                  </span>
                  <div className="mt-2 font-semibold text-slate-900">{track.title}</div>
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
                      <span className="font-medium text-slate-700">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href={`/tracks/${track.id}`}
                    className="mt-4 inline-flex h-9 items-center rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    Open track
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {availableTracks.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Available tracks</h2>
            <Link href="/tracks" className="text-sm text-emerald-700 hover:underline">
              See all →
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableTracks.map((t) => (
              <div
                key={t.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wider text-amber-700">
                  {t.code}
                </span>
                <div className="mt-2 font-semibold text-slate-900">{t.title}</div>
                {t.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                    {t.description}
                  </p>
                )}
                <div className="mt-3 text-xs text-slate-500">
                  {t.exam_minutes} min exam · {t.pass_score}% to pass
                </div>
                <Link
                  href={`/tracks/${t.id}`}
                  className="mt-4 inline-flex h-9 items-center rounded-md bg-gradient-to-r from-emerald-600 to-teal-600 px-3 text-sm font-medium text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
                >
                  View &amp; enroll
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const TONES = {
  emerald: { ring: 'ring-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-700' },
  amber: { ring: 'ring-amber-100', bar: 'bg-amber-500', text: 'text-amber-700' },
  indigo: { ring: 'ring-teal-100', bar: 'bg-teal-500', text: 'text-teal-700' },
} as const;

function Stat({
  label,
  value,
  sub,
  tone = 'indigo',
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: keyof typeof TONES;
}) {
  const t = TONES[tone];
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ${t.ring}`}>
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${t.bar}`} />
        <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </div>
      </div>
      <div className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}
