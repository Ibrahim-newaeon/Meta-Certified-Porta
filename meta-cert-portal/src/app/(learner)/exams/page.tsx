import Link from 'next/link';
import { requireUser } from '@/lib/auth/roles';

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
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Exams</h1>
        <p className="mt-1 text-sm text-slate-600">
          Your recent quiz and mock-exam attempts.
        </p>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white">
        {(attempts ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-600">
            No exam attempts yet. Open a track and start a quiz from any lesson.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                      className="text-slate-900 hover:underline"
                    >
                      {q.title}
                    </Link>
                  ) : (
                    q?.title ?? 'Quiz'
                  );
                return (
                  <tr key={a.id} className="border-t">
                    <td className="px-3 py-2">{titleCell}</td>
                    <td className="px-3 py-2 capitalize text-slate-600">{q?.kind ?? '—'}</td>
                    <td className="px-3 py-2 capitalize">{a.status.replace('_', ' ')}</td>
                    <td className="px-3 py-2">
                      {a.score !== null && a.score !== undefined
                        ? `${a.score}%${a.passed ? ' · passed' : ''}`
                        : '—'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">
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
