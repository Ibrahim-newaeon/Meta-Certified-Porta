import Link from 'next/link';
import { requireRole } from '@/lib/auth/roles';

function ActionCard({
  title,
  value,
  href,
}: {
  title: string;
  value: string | number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] focus-visible:border-[var(--color-focus-ring)]"
    >
      <div className="text-sm text-[var(--color-text-muted)]">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </Link>
  );
}

function Stat({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="px-4 py-2">
      <div className="text-xs uppercase tracking-wide text-[var(--color-text-subtle)]">
        {title}
      </div>
      <div className="mt-0.5 text-xl font-medium tabular-nums">{value}</div>
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
    0,
  );

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
          Manage
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard title="Users" value={userCount ?? 0} href="/admin/users" />
          <ActionCard
            title="Enrollments"
            value={enrollCount ?? 0}
            href="/admin/enrollments"
          />
          <ActionCard title="Tracks" value={trackCount ?? 0} href="/admin/tracks" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-medium text-[var(--color-text-muted)]">
          Activity
        </h2>
        <div className="flex flex-wrap divide-x divide-[var(--border)] rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <Stat title="Lesson completions" value={completionCount ?? 0} />
          <Stat title="AI tutor turns today" value={totalAiTurns} />
        </div>
      </section>
    </div>
  );
}
