import Link from 'next/link';
import { requireUser } from '@/lib/auth/roles';
import { Badge } from '@/components/shared/badge';

type LessonRef = { id: string; title: string; module_id: string } | null;
type ModuleRef = { id: string; track_id: string } | null;

export default async function ExamsPage() {
  const { user, supabase } = await requireUser();

  // Available quizzes = every quiz whose lesson sits inside a track the user
  // is enrolled in. RLS already restricts visibility, so the join is just a
  // filter for the UI.
  const { data: enrollments } = await supabase
    .from('enrollments')
    .select('track_id')
    .eq('user_id', user.id);
  const trackIds = (enrollments ?? []).map((e) => e.track_id);

  let available: Array<{
    id: string;
    title: string;
    kind: string;
    pass_score: number;
    question_count: number;
    time_limit_s: number | null;
    lesson: LessonRef;
    track_id: string | null;
  }> = [];

  if (trackIds.length > 0) {
    const { data: quizRows } = await supabase
      .from('quizzes')
      .select(
        'id, title, kind, pass_score, question_count, time_limit_s, lesson_id, lessons!inner(id, title, module_id, modules!inner(id, track_id))'
      )
      .in('lessons.modules.track_id', trackIds)
      .order('kind')
      .order('created_at', { ascending: false });

    available = (quizRows ?? []).map((q) => {
      const lesson = (Array.isArray(q.lessons) ? q.lessons[0] : q.lessons) as
        | (LessonRef & { modules: ModuleRef | ModuleRef[] })
        | null;
      const mod = lesson
        ? Array.isArray(lesson.modules)
          ? lesson.modules[0]
          : lesson.modules
        : null;
      return {
        id: q.id,
        title: q.title,
        kind: q.kind,
        pass_score: q.pass_score,
        question_count: q.question_count,
        time_limit_s: q.time_limit_s,
        lesson: lesson
          ? { id: lesson.id, title: lesson.title, module_id: lesson.module_id }
          : null,
        track_id: mod?.track_id ?? null,
      };
    });
  }

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(
      'id, status, score, passed, started_at, submitted_at, quiz_id, quizzes!inner(id, title, kind)'
    )
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50);

  // Index latest attempt per quiz so the available list can show "Resume" /
  // "Retake" / "Take quiz" appropriately.
  const lastByQuiz = new Map<
    string,
    { id: string; status: string; score: number | null; passed: boolean | null }
  >();
  for (const a of attempts ?? []) {
    if (!lastByQuiz.has(a.quiz_id)) {
      lastByQuiz.set(a.quiz_id, {
        id: a.id,
        status: a.status,
        score: a.score,
        passed: a.passed,
      });
    }
  }

  return (
    <div className="space-y-8 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Exams</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Take a practice quiz or mock exam from any lesson you&apos;re enrolled in.
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Available</h2>
        {available.length === 0 ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-6 text-center text-sm text-[var(--color-text-muted)]">
            No quizzes available yet. Enroll in a track and your admin will add
            practice quizzes per lesson.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((q) => {
              const last = lastByQuiz.get(q.id);
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
                      {q.lesson && (
                        <div className="mt-0.5 truncate text-xs text-[var(--color-text-subtle)]">
                          {q.lesson.title}
                        </div>
                      )}
                      <div className="mt-1 text-xs text-[var(--color-text-subtle)]">
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
                          Passed{' '}
                          {last.score != null ? `${Math.round(last.score)}%` : ''}
                        </Badge>
                      ) : (
                        <Badge variant="warn">
                          {last.score != null
                            ? `${Math.round(last.score)}%`
                            : 'Did not pass'}
                        </Badge>
                      ))}
                    {inProgress && <Badge variant="info">In progress</Badge>}
                  </div>
                  <div className="mt-auto flex flex-wrap items-center gap-2">
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
                        Last result →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Recent attempts</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          {(attempts ?? []).length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">
              No attempts yet — pick one of the quizzes above to start.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase text-[var(--color-text-muted)]">
                <tr>
                  <th className="px-3 py-2">Quiz</th>
                  <th className="px-3 py-2">Kind</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Score</th>
                  <th className="px-3 py-2">Started</th>
                </tr>
              </thead>
              <tbody>
                {(attempts ?? []).map((a) => {
                  const q = Array.isArray(a.quizzes)
                    ? a.quizzes[0]
                    : (a.quizzes as { id: string; title: string; kind: string } | null);
                  const titleCell =
                    a.status === 'submitted' && q?.id ? (
                      <Link
                        href={`/exam/${q.id}/result?attempt=${a.id}`}
                        className="text-[var(--color-text)] hover:underline"
                      >
                        {q.title}
                      </Link>
                    ) : (
                      q?.title ?? 'Quiz'
                    );
                  const scored = a.score !== null && a.score !== undefined;
                  const statusBadge =
                    a.status === 'submitted' ? (
                      a.passed ? (
                        <Badge variant="success">Passed</Badge>
                      ) : (
                        <Badge variant="warn">Did not pass</Badge>
                      )
                    ) : a.status === 'expired' ? (
                      <Badge variant="danger">Expired</Badge>
                    ) : (
                      <Badge variant="neutral">In progress</Badge>
                    );
                  return (
                    <tr key={a.id} className="border-t border-[var(--border)]">
                      <td className="px-3 py-2">{titleCell}</td>
                      <td className="px-3 py-2 capitalize text-[var(--color-text-muted)]">
                        {q?.kind ?? '—'}
                      </td>
                      <td className="px-3 py-2">{statusBadge}</td>
                      <td className="px-3 py-2 tabular-nums">
                        {scored ? `${a.score}%` : '—'}
                      </td>
                      <td className="px-3 py-2 text-[var(--color-text-subtle)]">
                        {new Date(a.started_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
