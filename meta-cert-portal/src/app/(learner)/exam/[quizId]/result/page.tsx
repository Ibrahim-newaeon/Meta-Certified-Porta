import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function ExamResultPage({
  params,
  searchParams,
}: {
  params: Promise<{ quizId: string }>;
  searchParams: Promise<{ attempt?: string }>;
}) {
  const { user, supabase } = await requireUser();
  const { quizId } = await params;
  const { attempt: attemptId } = await searchParams;
  if (!attemptId) notFound();

  const { data: attempt } = await supabase
    .from('quiz_attempts')
    .select('id, status, score, passed, submitted_at')
    .eq('id', attemptId)
    .single();
  if (!attempt || attempt.status === 'in_progress') notFound();

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, pass_score')
    .eq('id', quizId)
    .single();
  if (!quiz) notFound();

  // Fetch per-question correctness via the service role (is_correct is
  // hidden from authenticated reads). We only do this AFTER ownership has
  // been verified above (RLS on quiz_attempts select).
  const admin = createAdminClient();
  const { data: answers } = await admin
    .from('quiz_answers')
    .select('question_id, is_correct')
    .eq('attempt_id', attemptId);
  const { data: questions } = await admin
    .from('quiz_questions')
    .select('id, prompt, explanation, order_index')
    .eq('quiz_id', quizId)
    .order('order_index');

  // Belt-and-braces: confirm this attempt actually belongs to the caller.
  const { data: ownership } = await admin
    .from('quiz_attempts')
    .select('user_id')
    .eq('id', attemptId)
    .single();
  if (ownership?.user_id !== user.id) notFound();

  const correctness = new Map<string, boolean>();
  (answers ?? []).forEach((a) => correctness.set(a.question_id, !!a.is_correct));

  const score = attempt.score ?? 0;
  const passed = !!attempt.passed;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/dashboard" className="text-xs text-[var(--color-text-muted)] hover:underline">
        ← Dashboard
      </Link>

      <div
        className={`rounded-lg border p-6 ${
          passed
            ? 'border-[var(--color-success-border)] bg-[var(--color-success-bg)]'
            : 'border-[var(--color-warn-fg)]/40 bg-[var(--color-warn-bg)]'
        }`}
      >
        <div className="text-xs uppercase text-[var(--color-text-muted)]">{quiz.title}</div>
        <div className="mt-1 text-3xl font-semibold">
          {Math.round(score)}%{' '}
          <span
            className={
              passed
                ? 'text-[var(--color-success-fg)]'
                : 'text-[var(--color-warn-fg)]'
            }
          >
            {passed ? '· Passed' : '· Did not pass'}
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Pass mark: {quiz.pass_score}%{' '}
          {attempt.status === 'expired' && '(time expired)'}
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Per-question results</h2>
        <ol className="space-y-2">
          {(questions ?? []).map((q, i) => {
            const correct = correctness.get(q.id);
            return (
              <li
                key={q.id}
                className="flex items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)] p-3"
              >
                <span
                  className={`mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-xs font-bold ${
                    correct
                      ? 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)]'
                      : 'bg-[var(--color-danger-bg)] text-[var(--color-danger-fg)]'
                  }`}
                >
                  {correct ? '✓' : '✗'}
                </span>
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    {i + 1}. {q.prompt}
                  </div>
                  {q.explanation && (
                    <p className="mt-1 text-[var(--color-text-muted)]">{q.explanation}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
