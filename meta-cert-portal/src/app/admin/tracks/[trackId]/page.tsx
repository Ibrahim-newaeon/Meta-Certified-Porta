import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/roles';
import {
  ModuleCreateInline,
  LessonCreateInline,
  ModuleRow,
  LessonRow,
} from '@/components/admin/inline-forms';

export default async function TrackDetailPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { supabase } = await requireRole('admin');
  const { trackId } = await params;

  const { data: track } = await supabase
    .from('certification_tracks')
    .select('id, code, title, slug, is_published')
    .eq('id', trackId)
    .single();
  if (!track) notFound();

  const { data: modules } = await supabase
    .from('modules')
    .select(
      'id, title, order_index, description, lessons(id, title, summary, order_index, est_minutes)'
    )
    .eq('track_id', trackId)
    .order('order_index')
    .order('order_index', { foreignTable: 'lessons' });

  const moduleList = modules ?? [];

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tracks" className="text-xs text-[var(--color-text-muted)] hover:underline">
          ← Tracks
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          <span className="font-mono text-[var(--color-text-muted)]">{track.code}</span> · {track.title}
        </h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Slug: <span className="font-mono">{track.slug}</span> ·{' '}
          {track.is_published ? 'Published' : 'Draft'}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-[var(--color-text-muted)]">Modules</h2>
        <ModuleCreateInline trackId={track.id} />

        <div className="space-y-3">
          {moduleList.map((m, mIdx) => {
            const lessons = m.lessons ?? [];
            return (
              <ModuleRow
                key={m.id}
                module={{
                  id: m.id,
                  title: m.title,
                  order_index: m.order_index,
                  description: m.description ?? null,
                }}
                trackId={track.id}
                isFirst={mIdx === 0}
                isLast={mIdx === moduleList.length - 1}
              >
                <div className="mt-2 space-y-1 pl-3">
                  {lessons.map((l, lIdx) => (
                    <LessonRow
                      key={l.id}
                      lesson={{
                        id: l.id,
                        title: l.title,
                        summary: l.summary ?? null,
                        order_index: l.order_index,
                        est_minutes: l.est_minutes,
                      }}
                      moduleId={m.id}
                      trackId={track.id}
                      isFirst={lIdx === 0}
                      isLast={lIdx === lessons.length - 1}
                      href={`/admin/lessons/${l.id}`}
                    />
                  ))}
                  {lessons.length === 0 && (
                    <p className="px-2 py-1.5 text-xs text-[var(--color-text-subtle)]">No lessons yet.</p>
                  )}
                </div>

                <div className="mt-2">
                  <LessonCreateInline moduleId={m.id} />
                </div>
              </ModuleRow>
            );
          })}
          {moduleList.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">No modules yet — add one above.</p>
          )}
        </div>
      </section>
    </div>
  );
}
