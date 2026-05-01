import { requireRole } from '@/lib/auth/roles';
import { UnenrollButton } from '@/components/admin/unenroll-button';

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

      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
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
                <tr key={`${e.user_id}-${e.track_id}`} className="border-t">
                  <td className="px-3 py-2">
                    <div>{p.email}</div>
                    {p.full_name && (
                      <div className="text-xs text-slate-500">{p.full_name}</div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="font-mono text-xs text-slate-500">{t.code}</span>{' '}
                    {t.title}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {new Date(e.enrolled_at).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2">
                    {e.completed_at ? (
                      <span className="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-800">
                        Completed
                      </span>
                    ) : (
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                        In progress
                      </span>
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
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
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
