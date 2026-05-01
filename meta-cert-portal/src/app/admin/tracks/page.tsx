import Link from 'next/link';
import { requireRole } from '@/lib/auth/roles';
import { TrackCreateForm, TrackEditButton } from '@/components/admin/track-form';
import { PublishToggle, DeleteTrackButton } from '@/components/admin/track-row-actions';

export default async function TracksAdminPage() {
  const { supabase } = await requireRole('admin');

  const { data: tracks } = await supabase
    .from('certification_tracks')
    .select('id, code, title, slug, description, is_published, exam_minutes, pass_score, created_at')
    .order('code');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Certification tracks</h1>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">New track</h2>
        <TrackCreateForm />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">All tracks</h2>
        <div className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--surface)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--surface-muted)] text-left text-xs uppercase text-[var(--color-text-muted)]">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Exam (min)</th>
                <th className="px-3 py-2">Pass %</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(tracks ?? []).map((t) => (
                <tr key={t.id} className="border-t border-[var(--border)]">
                  <td className="px-3 py-2 font-mono">{t.code}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/admin/tracks/${t.id}`}
                      className="text-[var(--color-text)] hover:underline"
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <PublishToggle id={t.id} isPublished={t.is_published} />
                  </td>
                  <td className="px-3 py-2">{t.exam_minutes}</td>
                  <td className="px-3 py-2">{t.pass_score}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-3">
                      <TrackEditButton
                        track={{
                          id: t.id,
                          code: t.code,
                          title: t.title,
                          slug: t.slug,
                          description: t.description ?? null,
                          examMinutes: t.exam_minutes,
                          passScore: t.pass_score,
                        }}
                      />
                      <DeleteTrackButton id={t.id} code={t.code} />
                    </div>
                  </td>
                </tr>
              ))}
              {(!tracks || tracks.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-[var(--color-text-muted)]">
                    No tracks yet — create one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
