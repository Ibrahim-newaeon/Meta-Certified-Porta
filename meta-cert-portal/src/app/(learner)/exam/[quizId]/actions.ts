'use server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

type Result<T> = ({ data: T } | { error: string });

export type AttemptRow = {
  id: string;
  quiz_id: string;
  user_id: string;
  status: 'in_progress' | 'submitted' | 'expired';
  started_at: string;
  submitted_at: string | null;
  expires_at: string | null;
  score: number | null;
  passed: boolean | null;
};

export async function startAttemptAction(quizId: string): Promise<Result<AttemptRow>> {
  const { user, supabase } = await requireUser();
  z.string().uuid().parse(quizId);

  // Resume an in-progress attempt if one exists for this user/quiz.
  const { data: existing } = await supabase
    .from('quiz_attempts')
    .select('*')
    .eq('quiz_id', quizId)
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .maybeSingle();

  if (existing) {
    // Auto-expire if the timer ran out while the page was closed.
    if (existing.expires_at && new Date(existing.expires_at) < new Date()) {
      const admin = createAdminClient();
      await admin
        .from('quiz_attempts')
        .update({ status: 'expired', submitted_at: new Date().toISOString() })
        .eq('id', existing.id);
      return { error: 'Previous attempt timed out. Refresh to start a new one.' };
    }
    return { data: existing as AttemptRow };
  }

  const { data: quiz } = await supabase
    .from('quizzes')
    .select('time_limit_s')
    .eq('id', quizId)
    .single();

  const expires = quiz?.time_limit_s
    ? new Date(Date.now() + quiz.time_limit_s * 1000).toISOString()
    : null;

  // SECURITY: RLS "attempts_self_rw" enforces user_id = auth.uid() on insert
  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({ quiz_id: quizId, user_id: user.id, expires_at: expires })
    .select('*')
    .single();
  if (error) return { error: error.message };
  return { data: data as AttemptRow };
}

const Submit = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      selected: z.array(z.string().uuid()),
    })
  ),
});

export type SubmitResult = {
  score: number;
  passed: boolean;
  expired: boolean;
  attemptId: string;
};

export async function submitAttemptAction(
  input: z.input<typeof Submit>
): Promise<{ data: SubmitResult } | { error: string }> {
  const { user } = await requireUser();
  const parsed = Submit.safeParse(input);
  if (!parsed.success) return { error: 'Invalid submission' };
  const data = parsed.data;

  const admin = createAdminClient();

  // Validate ownership and current status — service role since RLS would
  // also work, but we want the canonical "is_correct" data which is REVOKEd
  // from authenticated.
  const { data: attempt } = await admin
    .from('quiz_attempts')
    .select('*')
    .eq('id', data.attemptId)
    .single();
  if (!attempt || attempt.user_id !== user.id) return { error: 'Forbidden' };
  if (attempt.status !== 'in_progress') return { error: 'Already submitted' };

  const expired = !!(attempt.expires_at && new Date(attempt.expires_at) < new Date());

  const { data: questions } = await admin
    .from('quiz_questions')
    .select('id, kind, quiz_question_options(id, is_correct)')
    .eq('quiz_id', attempt.quiz_id);

  const qList = questions ?? [];
  let correctCount = 0;

  const answerRows = data.answers
    .map((a) => {
      const q = qList.find((x) => x.id === a.questionId);
      if (!q) return null;
      const correctIds = new Set(
        (q.quiz_question_options ?? []).filter((o) => o.is_correct).map((o) => o.id)
      );
      const selectedIds = new Set(a.selected);
      const isCorrect =
        correctIds.size === selectedIds.size &&
        [...correctIds].every((id) => selectedIds.has(id));
      if (isCorrect) correctCount++;
      return {
        attempt_id: data.attemptId,
        question_id: a.questionId,
        selected_option_ids: a.selected,
        is_correct: isCorrect,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (answerRows.length) {
    await admin
      .from('quiz_answers')
      .upsert(answerRows, { onConflict: 'attempt_id,question_id' });
  }

  const total = qList.length || 1;
  const score = (correctCount / total) * 100;
  const { data: quizMeta } = await admin
    .from('quizzes')
    .select('pass_score')
    .eq('id', attempt.quiz_id)
    .single();

  const passed = score >= (quizMeta?.pass_score ?? 70);

  await admin
    .from('quiz_attempts')
    .update({
      status: expired ? 'expired' : 'submitted',
      submitted_at: new Date().toISOString(),
      score,
      passed,
    })
    .eq('id', data.attemptId);

  return { data: { score, passed, expired, attemptId: data.attemptId } };
}
