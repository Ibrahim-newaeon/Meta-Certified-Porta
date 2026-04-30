import { requireRole } from '@/lib/auth/roles';

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default async function AdminDashboard() {
  const { supabase } = await requireRole('admin');

  const [
    { count: userCount },
    { count: enrollCount },
    { count: trackCount },
    { count: completionCount },
    { data: aiUsage },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('certification_tracks').select('*', { count: 'exact', head: true }),
    supabase
      .from('progress')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed'),
    supabase.from('ai_usage_today').select('user_id, turns_today, tokens_today'),
  ]);

  const totalAiTurns = (aiUsage ?? []).reduce(
    (s, r) => s + (r.turns_today ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card title="Users" value={userCount ?? 0} />
        <Card title="Enrollments" value={enrollCount ?? 0} />
        <Card title="Tracks" value={trackCount ?? 0} />
        <Card title="Lesson completions" value={completionCount ?? 0} />
        <Card title="AI tutor turns today" value={totalAiTurns} />
      </div>
    </div>
  );
}
