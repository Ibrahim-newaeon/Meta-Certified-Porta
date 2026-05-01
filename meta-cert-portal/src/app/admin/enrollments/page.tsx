import { requireRole } from '@/lib/auth/roles';
import { UnenrollButton } from '@/components/admin/unenroll-button';
import { Badge } from '@/components/shared/badge';

type Enrollment = {
  user_id: string;
  track_id: string;
  enrolled_at: string;
  completed_at: string | null;
  profiles: { id: string; email: string; full_name: string | null } | { id: string; email: string; full_name: string | null }[] | null;
  certification_tracks: { id: string; code: string; title: string } | { id: string; code: string; title: string }[] | null;
};

export default async function EnrollmentsAdminPage() {
  const { supabase } = await requireRole('admin');

  const { data } = await supabase
    .from('enrollments')
    .select(
      'user_id, track_id, enrolled_at, completed_at, profiles!inner(id, email, full_name), certification_tracks!inner(id, code, title)'
    )
    .order('enrolled_at', { ascending: false });

  const rows = (data ?? []) as unknown as Enrollment[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Enrollments</h1>

      <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase text-[var(--color-text-muted)]">
            <tr>
              <th className="px-3 py-2">Learner</th>
              <th className="px-3 py-2">Track</th>
              <th className="px-3 py-2">Enrolled</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => {
              const p = Array.isArray(e.profiles) ? e.profiles[0] : e.profiles;
              const t = Array.isArray(e.certification_tracks)
                ? e.certification_tracks[0]
                : e.certification_tracks;
              if (!p || !t) return null;
              return (
                <tr key={`${e.user_id}-${e.track_id}`} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2">
                    <div>{p.email}</div>
                    {p.full_name && (
                      <div className="text-xs text-[var(--color-text-muted)]">{p.full_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-[var(--color-text-muted)]">{t.code}</span>{' '}
                    {t.title}
                  </td>
                  <td className="px-3 py-2 text-xs text-[var(--color-text-muted)]">
                    {new Date(e.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {e.completed_at ? (
                      <Badge variant="success">Completed</Badge>
                    ) : (
                      <Badge variant="neutral">In progress</Badge>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <UnenrollButton
                      userId={e.user_id}
                      trackId={e.track_id}
                      email={p.email}
                      trackCode={t.code}
                    />
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[var(--color-text-muted)]">
                  No enrollments yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
