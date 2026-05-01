import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/roles';
import { EnrollButton, UnenrollButton } from '@/components/learner/enroll-button';

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { user, supabase } = await requireUser();
  const { trackId } = await params;

  const { data: track } = await supabase
    .from('certification_tracks')
    .select('id, code, title, description, exam_minutes, pass_score, is_published')
    .eq('id', trackId)
    .single();

  // RLS will hide unpublished tracks from non-admin learners.
  if (!track) notFound();

  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('id')
    .eq('track_id', track.id)
    .eq('user_id', user.id)
    .maybeSingle();

  const enrolled = !!enrollment;

  // Lessons are read-gated by enrollment via the resources RLS policy, but
  // lessons + modules themselves are readable for any published track so we
  // can show a table of contents pre-enrollment.
  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_index, lessons(id, title, order_index, est_minutes)')
    .eq('track_id', track.id)
    .order('order_index')
    .order('order_index', { foreignTable: 'lessons' });

  // Progress lookup so we can render checkmarks next to completed lessons.
  const lessonIds = (modules ?? []).flatMap((m) =>
    (m.lessons ?? []).map((l) => l.id as string)
  );
  const progressMap = new Map<string, string>();
  if (enrolled && lessonIds.length) {
    const { data: progressRows } = await supabase
      .from('progress')
      .select('lesson_id, status')
      .in('lesson_id', lessonIds)
      .eq('user_id', user.id);
    (progressRows ?? []).forEach((p) => progressMap.set(p.lesson_id, p.status));
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <Link href="/tracks" className="text-xs text-[var(--color-text-muted)] hover:underline">
          ← All tracks
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          <span className="font-mono text-[var(--color-text-muted)]">{track.code}</span> · {track.title}
        </h1>
        {track.description && (
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">{track.description}</p>
        )}
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
          {track.exam_minutes} min exam · {track.pass_score}% to pass
        </div>
      </div>

      <div className="flex items-center gap-3">
        {enrolled ? (
          <>
            <span className="inline-flex h-8 items-center rounded-md bg-[var(--color-success-bg)] px-3 text-sm font-medium text-[var(--color-success-fg)]">
              You&apos;re enrolled
            </span>
            <UnenrollButton trackId={track.id} />
          </>
        ) : (
          <EnrollButton trackId={track.id} />
        )}
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Curriculum</h2>
        {(modules ?? []).map((m) => (
          <div key={m.id} className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <div className="mb-2 text-sm font-medium">{m.title}</div>
            <ul className="space-y-1">
              {(m.lessons ?? []).map((l) => {
                const status = progressMap.get(l.id as string);
                const statusLabel =
                  status === 'completed'
                    ? 'Completed'
                    : status === 'in_progress'
                      ? 'In progress'
                      : 'Not started';
                const statusGlyph =
                  status === 'completed' ? '✓' : status === 'in_progress' ? '◐' : '○';
                return (
                  <li key={l.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span aria-hidden="true" className="text-[var(--color-text-subtle)]">
                        {statusGlyph}
                      </span>
                      <span className="sr-only">{statusLabel}: </span>
                      {enrolled ? (
                        <Link
                          href={`/lessons/${l.id}`}
                          className="text-[var(--color-text)] hover:underline"
                        >
                          {l.title}
                        </Link>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">{l.title}</span>
                      )}
                    </div>
                    <span className="text-xs text-[var(--color-text-subtle)]">
                      {l.est_minutes ?? 0} min
                    </span>
                  </li>
                );
              })}
              {(m.lessons ?? []).length === 0 && (
                <li className="text-xs text-[var(--color-text-subtle)]">No lessons in this module yet.</li>
              )}
            </ul>
          </div>
        ))}
        {(!modules || modules.length === 0) && (
          <p className="text-sm text-[var(--color-text-muted)]">This track has no modules yet.</p>
        )}
      </section>
    </div>
  );
}
