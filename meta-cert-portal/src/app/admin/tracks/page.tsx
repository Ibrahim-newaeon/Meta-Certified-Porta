import Link from 'next/link';
import { requireRole } from '@/lib/auth/roles';
import { TrackCreateForm } from '@/components/admin/track-form';
import { PublishToggle, DeleteTrackButton } from '@/components/admin/track-row-actions';

export default async function TracksAdminPage() {
  const { supabase } = await requireRole('admin');

  const { data: tracks } = await supabase
    .from('certification_tracks')
    .select('id, code, title, slug, is_published, exam_minutes, pass_score, created_at')
    .order('code');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Certification tracks</h1>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">New track</h2>
        <TrackCreateForm />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-medium text-slate-700">All tracks</h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Exam (min)</th>
                <th className="px-3 py-2">Pass %</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {(tracks ?? []).map((t) => (
                <tr key={t.id} className="border-t">
                  <td className="px-3 py-2 font-mono">{t.code}</td>
                  <td className="px-3 py-2">
                    <Link href={`/admin/tracks/${t.id}`} className="text-slate-900 hover:underline">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2">
                    <PublishToggle id={t.id} isPublished={t.is_published} />
                  </td>
                  <td className="px-3 py-2">{t.exam_minutes}</td>
                  <td className="px-3 py-2">{t.pass_score}</td>
                  <td className="px-3 py-2 text-right">
                    <DeleteTrackButton id={t.id} code={t.code} />
                  </td>
                </tr>
              ))}
              {(!tracks || tracks.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
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
