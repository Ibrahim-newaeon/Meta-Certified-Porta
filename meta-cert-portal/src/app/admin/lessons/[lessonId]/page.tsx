import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/roles';
import { ResourceLinkForm } from '@/components/admin/resource-link-form';
import { ResourcePdfForm } from '@/components/admin/resource-pdf-form';
import { ResourceVideoForm } from '@/components/admin/resource-video-form';
import { ResourceRowActions } from '@/components/admin/resource-row-actions';
import { QuizGenButton } from '@/components/admin/quiz-gen-button';
import { LessonHeaderEdit } from '@/components/admin/lesson-header-edit';

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
    .select(
      'id, title, summary, est_minutes, order_index, module_id, modules!inner(track_id, title)'
    )
    .eq('id', lessonId)
    .single();
  if (!lesson) notFound();

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
            className="text-xs text-[var(--color-text-muted)] hover:underline"
          >
            ← Track
          </Link>
        )}
        <div className="mt-1 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{lesson.title}</h1>
            <p className="text-sm text-[var(--color-text-muted)]">
              {lesson.est_minutes ?? 0} min · Module: {moduleTitle ?? '—'}
            </p>
            {lesson.summary && (
              <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-muted)]">{lesson.summary}</p>
            )}
          </div>
          {trackId && (
            <LessonHeaderEdit
              lesson={{
                id: lesson.id,
                title: lesson.title,
                summary: lesson.summary ?? null,
                est_minutes: lesson.est_minutes,
                order_index: lesson.order_index,
              }}
              trackId={trackId}
            />
          )}
        </div>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">Resources</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="px-3 py-2">Kind</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Detail</th>
                <th className="px-3 py-2">Tags</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono text-xs uppercase">{r.kind}</td>
                  <td className="px-3 py-2">{r.title}</td>
                  <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    {r.kind === 'link' && (
                      <a
                        href={r.url ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
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
                          <span className="text-[var(--color-warn-fg)]">
                            Encoding (waiting on Mux webhook)
                          </span>
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
                        <span
                          key={c}
                          className="rounded bg-[var(--color-neutral-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-neutral-fg)]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <ResourceRowActions
                      resource={{
                        id: r.id,
                        kind: r.kind,
                        title: r.title,
                        url: r.url,
                        exam_codes: r.exam_codes,
                        order_index: r.order_index,
                      }}
                      lessonId={lesson.id}
                      isFirst={idx === 0}
                      isLast={idx === rows.length - 1}
                    />
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-text-muted)]">
                    No resources yet — add one below.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {rows.some((r) => r.kind === 'pdf' || r.kind === 'link') && (
        <section>
          <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">AI quiz</h2>
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="mb-3 text-xs text-[var(--color-text-muted)]">
              Generate a Meta-style practice quiz grounded on this lesson&apos;s
              study material — uses extracted text from every PDF and link
              resource. The quiz is scoped to this lesson and added to the
              quizzes table; learners can take it from the lesson page or{' '}
              <span className="font-mono">/exam/&lt;quizId&gt;</span>.
            </p>
            <QuizGenButton
              lessonId={lesson.id}
              examCodes={Array.from(new Set(rows.flatMap((r) => r.exam_codes)))}
            />
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">Add link</h3>
          <ResourceLinkForm lessonId={lesson.id} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">Add PDF</h3>
          <ResourcePdfForm lessonId={lesson.id} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">Add video</h3>
          <ResourceVideoForm lessonId={lesson.id} />
        </div>
      </section>
    </div>
  );
}
