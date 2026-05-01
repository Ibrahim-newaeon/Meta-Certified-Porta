import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/roles';
import { startAttemptAction } from './actions';
import { ExamRunner, type ExamQuestion } from '@/components/learner/exam-runner';

export default async function ExamPage({
  params,
}: {
  params: Promise<{ quizId: string }>;
}) {
  const { supabase } = await requireUser();
  const { quizId } = await params;

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('id, title, kind, time_limit_s, pass_score, question_count')
    .eq('id', quizId)
    .single();
  if (!quiz) notFound();

  const startResult = await startAttemptAction(quizId);
  if ('error' in startResult) {
    return (
      <div className="mx-auto max-w-3xl p-6">
        <div
          role="alert"
          className="rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-4 text-sm text-[var(--color-danger-fg)]"
        >
          {startResult.error}
        </div>
      </div>
    );
  }

  // SECURITY: is_correct is column-level REVOKEd from authenticated, so this
  // SELECT cannot leak the answer key to the client.
  const { data: questions } = await supabase
    .from('quiz_questions')
    .select(
      'id, kind, prompt, scenario, order_index, quiz_question_options(id, label, order_index)'
    )
    .eq('quiz_id', quizId)
    .order('order_index')
    .order('order_index', { foreignTable: 'quiz_question_options' });

  const ordered: ExamQuestion[] = (questions ?? []).map((q) => ({
    id: q.id,
    kind: q.kind,
    prompt: q.prompt,
    scenario: q.scenario,
    order_index: q.order_index,
    quiz_question_options: (q.quiz_question_options ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      order_index: o.order_index,
    })),
  }));

  return (
    <div>
      <div className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div>
            <h1 className="font-semibold">{quiz.title}</h1>
            <p className="text-xs text-[var(--color-text-muted)]">
              {quiz.kind === 'mock_exam' ? 'Mock exam' : 'Practice quiz'}
              {quiz.time_limit_s
                ? ` · ${Math.round(quiz.time_limit_s / 60)} min`
                : ' · untimed'}{' '}
              · pass {quiz.pass_score}%
            </p>
          </div>
        </div>
      </div>
      <ExamRunner
        quizId={quiz.id}
        attemptId={startResult.data.id}
        expiresAt={startResult.data.expires_at}
        questions={ordered}
      />
    </div>
  );
}
