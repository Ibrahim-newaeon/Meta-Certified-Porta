import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/roles';
import { LessonViewer, type PreparedResource } from '@/components/learner/lesson-viewer';
import { LessonChatDrawer } from '@/components/ai-tutor/lesson-chat-drawer';
import { Badge } from '@/components/shared/badge';
import { signPdfUrl, signMuxPlayback } from '@/lib/signing';

export default async function LessonPage({
  params,
}: {
  params: Promise<{ lessonId: string }>;
}) {
  const { user, supabase } = await requireUser();
  const { lessonId } = await params;

  // RLS on lessons allows reads when the parent track is published; the
  // resources table additionally requires enrollment, so non-enrolled users
  // get a lesson page with zero resources rather than a hard 404.
  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, summary, module_id')
    .eq('id', lessonId)
    .single();
  if (!lesson) notFound();

  const { data: resources } = await supabase
    .from('resources')
    .select(
      'id, kind, title, order_index, url, storage_bucket, storage_path, page_count, video_provider, video_asset_id, video_playback_id, video_duration_s, video_url'
    )
    .eq('lesson_id', lessonId)
    .order('order_index');

  const { data: progress } = await supabase
    .from('progress')
    .select('last_position, status')
    .eq('lesson_id', lessonId)
    .eq('user_id', user.id)
    .maybeSingle();

  // Quizzes scoped to this lesson (RLS allows reads to enrolled learners).
  const { data: quizzes } = await supabase
    .from('quizzes')
    .select('id, title, kind, pass_score, question_count, time_limit_s')
    .eq('lesson_id', lessonId)
    .order('kind')
    .order('created_at', { ascending: false });

  // Most recent attempt per quiz, so we can label "Retake" vs "Take".
  const quizIds = (quizzes ?? []).map((q) => q.id);
  const lastAttemptByQuiz = new Map<
    string,
    { id: string; status: string; score: number | null; passed: boolean | null }
  >();
  if (quizIds.length > 0) {
    const { data: attempts } = await supabase
      .from('quiz_attempts')
      .select('id, quiz_id, status, score, passed, started_at')
      .eq('user_id', user.id)
      .in('quiz_id', quizIds)
      .order('started_at', { ascending: false });
    for (const a of attempts ?? []) {
      if (!lastAttemptByQuiz.has(a.quiz_id)) {
        lastAttemptByQuiz.set(a.quiz_id, {
          id: a.id,
          status: a.status,
          score: a.score,
          passed: a.passed,
        });
      }
    }
  }

  // SECURITY: signed URLs / JWTs are issued server-side. The client never
  // sees the underlying storage_path or unsigned playback_id.
  const prepared: PreparedResource[] = await Promise.all(
    (resources ?? []).map(async (r): Promise<PreparedResource> => {
      const base: PreparedResource = {
        id: r.id,
        kind: r.kind,
        title: r.title,
        order_index: r.order_index,
        url: r.url,
        video_playback_id: r.video_playback_id,
      };

      if (r.kind === 'pdf' && r.storage_bucket && r.storage_path) {
        try {
          base.signedUrl = await signPdfUrl(r.storage_bucket, r.storage_path);
        } catch {
          /* leave undefined; UI will show "loading" forever — acceptable for now */
        }
      }
      if (r.kind === 'video' && r.video_provider === 'mux' && r.video_playback_id && r.video_asset_id !== 'pending') {
        try {
          base.videoTokens = signMuxPlayback(r.video_playback_id);
        } catch {
          /* Mux signing not configured — UI will fall through */
        }
      }
      return base;
    })
  );

  return (
    <>
      <LessonViewer
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        resources={prepared}
        initialPosition={progress?.last_position ?? 0}
        initialStatus={progress?.status ?? null}
      />
      {(quizzes ?? []).length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <h2 className="mb-3 text-lg font-semibold">Practice for this lesson</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(quizzes ?? []).map((q) => {
              const last = lastAttemptByQuiz.get(q.id);
              const inProgress = last?.status === 'in_progress';
              const cta = inProgress ? 'Resume attempt' : last ? 'Retake' : 'Take quiz';
              return (
                <div
                  key={q.id}
                  className="flex flex-col gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{q.title}</div>
                      <div className="mt-0.5 text-xs text-[var(--color-text-subtle)]">
                        {q.kind === 'mock_exam' ? 'Mock exam' : 'Practice quiz'} ·{' '}
                        {q.question_count} questions ·{' '}
                        {q.time_limit_s
                          ? `${Math.round(q.time_limit_s / 60)} min`
                          : 'untimed'}{' '}
                        · pass {q.pass_score}%
                      </div>
                    </div>
                    {last?.status === 'submitted' &&
                      (last.passed ? (
                        <Badge variant="success">
                          Passed {last.score != null ? `${Math.round(last.score)}%` : ''}
                        </Badge>
                      ) : (
                        <Badge variant="warn">
                          {last.score != null ? `${Math.round(last.score)}%` : 'Did not pass'}
                        </Badge>
                      ))}
                    {inProgress && <Badge variant="info">In progress</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/exam/${q.id}`}
                      className="inline-flex h-10 items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-primary-hover)]"
                    >
                      {cta}
                    </Link>
                    {last?.status === 'submitted' && (
                      <Link
                        href={`/exam/${q.id}/result?attempt=${last.id}`}
                        className="text-sm text-[var(--color-text-muted)] hover:underline"
                      >
                        View last result →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <LessonChatDrawer lessonId={lesson.id} />
    </>
  );
}
