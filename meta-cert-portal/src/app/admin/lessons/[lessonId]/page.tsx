import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/roles';
import { ResourceLinkForm } from '@/components/admin/resource-link-form';
import { ResourcePdfForm } from '@/components/admin/resource-pdf-form';
import { ResourceVideoForm } from '@/components/admin/resource-video-form';
import { DeleteResourceButton } from '@/components/admin/delete-resource-button';

type ResourceRow = {
  id: string;
  kind: 'link' | 'pdf' | 'video';
  title: string;
  order_index: number;
  url: string | null;
  storage_path: string | null;
  page_count: number | null;
  video_provider: string | null;
  video_asset_id: string | null;
  video_playback_id: string | null;
  video_duration_s: number | null;
  exam_codes: string[];
};

export default async function LessonAdminPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { supabase } = await requireRole('admin');
  const { lessonId } = await params;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, summary, est_minutes, module_id, modules!inner(track_id, title)')
    .eq('id', lessonId)
    .single();
  if (!lesson) notFound();

  // Supabase typings model joins as arrays even when the FK is to-one.
  const moduleRow = Array.isArray(lesson.modules)
    ? lesson.modules[0]
    : (lesson.modules as { track_id: string; title: string } | null);
  const trackId: string | undefined = moduleRow?.track_id;
  const moduleTitle: string | undefined = moduleRow?.title;

  const { data: resources } = await supabase
    .from('resources')
    .select(
      'id, kind, title, order_index, url, storage_path, page_count, video_provider, video_asset_id, video_playback_id, video_duration_s, exam_codes'
    )
    .eq('lesson_id', lessonId)
    .order('order_index');

  const rows = (resources ?? []) as ResourceRow[];

  return (
    <div className="space-y-6">
      <div>
        {trackId && (
          <Link
            href={`/admin/tracks/${trackId}`}
            className="text-xs text-slate-500 hover:underline"
          >
            ← Track
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold">{lesson.title}</h1>
        <p className="text-sm text-slate-500">
          {lesson.est_minutes ?? 0} min ·{' '}
          Module: {moduleTitle ?? '—'}
        </p>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">Resources</h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Detail</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs uppercase">{r.kind}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {r.kind === 'link' && (
                      <a href={r.url ?? '#'} target="_blank" rel="noopener noreferrer" className="underline">
                        {r.url}
                      </a>
                    )}
                    {r.kind === 'pdf' && (
                      <span>
                        {r.page_count ?? 0} pages · {r.storage_path}
                      </span>
                    )}
                    {r.kind === 'video' && (
                      <span>
                        {r.video_asset_id === 'pending' ? (
                          <span className="text-amber-600">Encoding (waiting on Mux webhook)</span>
                        ) : (
                          <>
                            {r.video_duration_s ?? 0}s · playback {r.video_playback_id}
                          </>
                        )}
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {r.exam_codes.map((c) => (
                        <span key={c} className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <DeleteResourceButton id={r.id} lessonId={lesson.id} />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                    No resources yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Add link</h3>
          <ResourceLinkForm lessonId={lesson.id} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Add PDF</h3>
          <ResourcePdfForm lessonId={lesson.id} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-slate-700">Add video</h3>
          <ResourceVideoForm lessonId={lesson.id} />
        </div>
      </section>
    </div>
  );
}
