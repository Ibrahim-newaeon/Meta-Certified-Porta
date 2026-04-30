import Link from 'next/link';
import { requireUser } from '@/lib/auth/roles';

export default async function Dashboard() {
  const { user, supabase } = await requireUser();

  const [enrollmentsRes, recentRes] = await Promise.all([
    supabase
      .from('enrollments')
      .select(
        'track_id, enrolled_at, completed_at, certification_tracks!inner(id, code, title, slug, description)'
      )
      .eq('user_id', user.id),
    supabase
      .from('progress')
      .select('lesson_id, last_position, status, updated_at, lessons!inner(id, title)')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const enrollments = enrollmentsRes.data ?? [];
  const recent = recentRes.data;
  const recentLesson = recent
    ? Array.isArray(recent.lessons)
      ? recent.lessons[0]
      : (recent.lessons as { id: string; title: string } | null)
    : null;

  return (
    <div className="space-y-8 p-6">
      <h1 className="text-2xl font-semibold">Welcome back</h1>

      {recentLesson && (
        <div className="rounded-lg border bg-white p-4">
          <div className="text-xs uppercase text-slate-500">Continue where you left off</div>
          <div className="mt-1 text-lg font-medium">{recentLesson.title}</div>
          <Link
            href={`/lessons/${recentLesson.id}`}
            className="mt-3 inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Resume
          </Link>
        </div>
      )}

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
              return (
                <div key={e.track_id} className="rounded-lg border bg-white p-4">
                  <div className="font-mono text-xs text-slate-500">{track.code}</div>
                  <div className="mt-1 font-semibold">{track.title}</div>
                  {track.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-slate-600">{track.description}</p>
                  )}
                  <Link
                    href={`/tracks/${track.id}`}
                    className="mt-3 inline-flex h-9 items-center rounded-md border border-slate-300 px-3 text-sm hover:bg-slate-50"
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
