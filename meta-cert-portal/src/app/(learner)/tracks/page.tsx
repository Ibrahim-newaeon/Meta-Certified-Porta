import Link from 'next/link';
import { requireUser } from '@/lib/auth/roles';

export default async function TracksBrowsePage() {
  const { user, supabase } = await requireUser();

  const [tracksRes, enrollsRes] = await Promise.all([
    supabase
      .from('certification_tracks')
      .select('id, code, title, slug, description, exam_minutes, pass_score')
      .eq('is_published', true)
      .order('code'),
    supabase.from('enrollments').select('track_id').eq('user_id', user.id),
  ]);

  const enrolledIds = new Set((enrollsRes.data ?? []).map((e) => e.track_id));
  const tracks = tracksRes.data ?? [];

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Certification tracks</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t) => (
          <Link
            key={t.id}
            href={`/tracks/${t.id}`}
            className="rounded-lg border bg-white p-4 transition hover:border-slate-400 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs text-slate-500">{t.code}</span>
              {enrolledIds.has(t.id) && (
                <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
                  Enrolled
                </span>
              )}
            </div>
            <div className="mt-1 font-semibold">{t.title}</div>
            {t.description && (
              <p className="mt-2 line-clamp-3 text-sm text-slate-600">{t.description}</p>
            )}
            <div className="mt-3 text-xs text-slate-500">
              {t.exam_minutes} min exam · {t.pass_score}% to pass
            </div>
          </Link>
        ))}
        {tracks.length === 0 && (
          <p className="col-span-full text-center text-sm text-slate-500">
            No published tracks yet — check back soon.
          </p>
        )}
      </div>
    </div>
  );
}
