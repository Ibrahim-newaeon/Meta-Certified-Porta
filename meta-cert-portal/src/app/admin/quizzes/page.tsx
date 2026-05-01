import Link from 'next/link';
import { requireRole } from '@/lib/auth/roles';
import { DeleteQuizButton } from '@/components/admin/quiz-row-actions';

type QuizRow = {
  id: string;
  title: string;
  kind: string;
  pass_score: number;
  question_count: number;
  exam_codes: string[];
  created_at: string;
  lesson_id: string;
  lessons: { id: string; title: string; module_id: string } | { id: string; title: string; module_id: string }[] | null;
};

export default async function QuizzesAdminPage() {
  const { supabase } = await requireRole('admin');

  const { data } = await supabase
    .from('quizzes')
    .select(
      'id, title, kind, pass_score, question_count, exam_codes, created_at, lesson_id, lessons!inner(id, title, module_id)'
    )
    .order('created_at', { ascending: false });

  const quizzes = (data ?? []) as unknown as QuizRow[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Quizzes</h1>

      <p className="text-sm text-[var(--color-text-muted)]">
        Quizzes are generated from a lesson&apos;s PDF on the lesson admin page. Take a
        quiz at <span className="font-mono">/exam/&lt;quizId&gt;</span>.
      </p>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Lesson</th>
              <th className="px-3 py-2">Kind</th>
              <th className="px-3 py-2">Questions</th>
              <th className="px-3 py-2">Pass %</th>
              <th className="px-3 py-2">Tags</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.map((q) => {
              const lesson = Array.isArray(q.lessons) ? q.lessons[0] : q.lessons;
              return (
                <tr key={q.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">{q.title}</td>
                  <td className="px-3 py-2">
                    {lesson ? (
                      <Link
                        href={`/admin/lessons/${lesson.id}`}
                        className="text-[var(--color-text)] hover:underline"
                      >
                        {lesson.title}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{q.kind}</td>
                  <td className="px-3 py-2">{q.question_count}</td>
                  <td className="px-3 py-2">{q.pass_score}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {(q.exam_codes ?? []).map((c) => (
                        <span
                          key={c}
                          className="rounded bg-[var(--color-neutral-bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-neutral-fg)]"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    {new Date(q.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <Link
                        href={`/exam/${q.id}`}
                        className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                      >
                        Preview
                      </Link>
                      <DeleteQuizButton id={q.id} title={q.title} />
                    </div>
                  </td>
                </tr>
              );
            })}
            {quizzes.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[var(--color-text-muted)]">
                  No quizzes yet — generate one from a lesson with a PDF resource.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
