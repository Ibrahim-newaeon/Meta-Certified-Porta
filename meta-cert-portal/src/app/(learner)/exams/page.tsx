import Link from 'next/link';
import { requireUser } from '@/lib/auth/roles';
import { Badge } from '@/components/shared/badge';

export default async function ExamsPage() {
  const { user, supabase } = await requireUser();

  const { data: attempts } = await supabase
    .from('quiz_attempts')
    .select(
      'id, status, score, passed, started_at, submitted_at, quizzes!inner(id, title, kind)'
    )
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Exams</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Your recent quiz and mock-exam attempts.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        {(attempts ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">
            No exam attempts yet. Open a track and start a quiz from any lesson.
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
                      href={`/exam/${q.id}/result`}
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
    </div>
  );
}
