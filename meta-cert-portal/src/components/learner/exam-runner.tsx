'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitAttemptAction } from '@/app/(learner)/exam/[quizId]/actions';

export type ExamQuestion = {
  id: string;
  kind: 'single' | 'multi' | 'scenario';
  prompt: string;
  scenario: string | null;
  order_index: number;
  quiz_question_options: { id: string; label: string; order_index: number }[];
};

export function ExamRunner({
  quizId,
  attemptId,
  expiresAt,
  questions,
}: {
  quizId: string;
  attemptId: string;
  expiresAt: string | null;
  questions: ExamQuestion[];
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialRemaining = useMemo(() => {
    if (!expiresAt) return null;
    return Math.max(0, Math.floor((+new Date(expiresAt) - Date.now()) / 1000));
  }, [expiresAt]);

  const [remaining, setRemaining] = useState<number | null>(initialRemaining);

  useEffect(() => {
    if (remaining == null) return;
    if (remaining <= 0) {
      handleSubmit();
      return;
    }
    const t = setInterval(() => {
      setRemaining((r) => (r == null ? r : Math.max(0, r - 1)));
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining]);

  const q = questions[idx];

  function setSel(qid: string, sel: string[]) {
    setAnswers((a) => ({ ...a, [qid]: sel }));
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const payload = questions.map((qq) => ({
      questionId: qq.id,
      selected: answers[qq.id] ?? [],
    }));

    const res = await submitAttemptAction({ attemptId, answers: payload });
    setSubmitting(false);

    if ('error' in res) {
      setError(res.error);
      return;
    }
    router.push(`/exam/${quizId}/result?attempt=${res.data.attemptId}`);
  }

  if (!q) {
    return (
      <div className="rounded-lg border bg-white p-6 text-sm text-slate-600">
        This quiz has no questions yet. Ask an admin to generate or add some.
      </div>
    );
  }

  const isMulti = q.kind === 'multi';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-600">
          Question {idx + 1} of {questions.length}
        </span>
        {remaining != null && (
          <span
            className={`font-mono text-sm ${
              remaining < 60 ? 'font-bold text-red-600' : 'text-slate-700'
            }`}
          >
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}
          </span>
        )}
      </div>

      <div className="rounded-lg border bg-white p-6">
        {q.scenario && (
          <div className="mb-4 rounded-md bg-slate-50 p-3 text-sm text-slate-700">
            {q.scenario}
          </div>
        )}
        <h3 className="text-lg font-medium">{q.prompt}</h3>
        <div className="mt-4 space-y-2">
          {q.quiz_question_options.map((o) => {
            const sel = answers[q.id] ?? [];
            const checked = sel.includes(o.id);
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                  checked ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:border-slate-400'
                }`}
              >
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={`q-${q.id}`}
                  checked={checked}
                  onChange={(e) => {
                    if (isMulti) {
                      setSel(
                        q.id,
                        e.target.checked
                          ? [...sel, o.id]
                          : sel.filter((x) => x !== o.id)
                      );
                    } else {
                      setSel(q.id, e.target.checked ? [o.id] : []);
                    }
                  }}
                  className="mt-1"
                />
                <span className="text-sm">{o.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-between">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="inline-flex h-9 items-center rounded-md border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50 disabled:opacity-50"
        >
          ← Back
        </button>
        {idx < questions.length - 1 ? (
          <button
            onClick={() => setIdx((i) => i + 1)}
            className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-50"
          >
            {submitting ? 'Submitting…' : 'Submit exam'}
          </button>
        )}
      </div>
    </div>
  );
}
