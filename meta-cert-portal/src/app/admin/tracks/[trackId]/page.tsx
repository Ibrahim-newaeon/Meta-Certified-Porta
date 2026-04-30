import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/roles';
import {
  ModuleCreateInline,
  LessonCreateInline,
  DeleteModuleButton,
  DeleteLessonButton,
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
      'id, title, order_index, lessons(id, title, order_index, est_minutes)'
    )
    .eq('track_id', trackId)
    .order('order_index')
    .order('order_index', { foreignTable: 'lessons' });

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/tracks" className="text-xs text-slate-500 hover:underline">
          ← Tracks
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">
          <span className="font-mono text-slate-500">{track.code}</span> · {track.title}
        </h1>
        <p className="text-sm text-slate-500">
          Slug: <span className="font-mono">{track.slug}</span> ·{' '}
          {track.is_published ? 'Published' : 'Draft'}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-slate-700">Modules</h2>
        <ModuleCreateInline trackId={track.id} />

        <div className="space-y-3">
          {(modules ?? []).map((m) => (
            <div key={m.id} className="rounded-lg border bg-white p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400">#{m.order_index}</span>{' '}
                  <span className="font-medium">{m.title}</span>
                </div>
                <DeleteModuleButton id={m.id} trackId={track.id} />
              </div>

              <div className="mt-2 space-y-1 pl-3">
                {(m.lessons ?? []).map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-slate-50"
                  >
                    <Link
                      href={`/admin/lessons/${l.id}`}
                      className="text-sm text-slate-800 hover:underline"
                    >
                      <span className="text-xs text-slate-400">#{l.order_index}</span>{' '}
                      {l.title}{' '}
                      <span className="text-xs text-slate-400">
                        ({l.est_minutes ?? 0} min)
                      </span>
                    </Link>
                    <DeleteLessonButton id={l.id} trackId={track.id} />
                  </div>
                ))}
                {(m.lessons ?? []).length === 0 && (
                  <p className="px-2 py-1.5 text-xs text-slate-400">No lessons yet.</p>
                )}
              </div>

              <div className="mt-2">
                <LessonCreateInline moduleId={m.id} />
              </div>
            </div>
          ))}
          {(!modules || modules.length === 0) && (
            <p className="text-sm text-slate-500">No modules yet — add one above.</p>
          )}
        </div>
      </section>
    </div>
  );
}
