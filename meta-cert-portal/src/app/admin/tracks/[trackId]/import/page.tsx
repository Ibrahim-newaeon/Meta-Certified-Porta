import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth/roles';
import { ImportZipForm } from '@/components/admin/import-zip-form';

export default async function ImportPage({
  params,
}: {
  params: Promise<{ trackId: string }>;
}) {
  const { supabase } = await requireRole('admin');
  const { trackId } = await params;

  const { data: track } = await supabase
    .from('certification_tracks')
    .select('id, code, title')
    .eq('id', trackId)
    .single();
  if (!track) notFound();

  const { data: modules } = await supabase
    .from('modules')
    .select('id, title, order_index')
    .eq('track_id', trackId)
    .order('order_index');

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/admin/tracks/${trackId}`}
          className="text-xs text-[var(--color-text-muted)] hover:underline"
        >
          ← {track.code} · {track.title}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Bulk import lessons</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Upload a .zip of .docx files. Each .docx becomes one lesson under
          either a new module or an existing one on this track. Files are sorted
          naturally — prefix names with <span className="font-mono">01_</span>,{' '}
          <span className="font-mono">02_</span> to control order.
        </p>
      </div>

      <ImportZipForm trackId={track.id} modules={modules ?? []} />

      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-4 text-xs text-[var(--color-text-muted)]">
        <p className="font-medium text-[var(--color-text)]">What gets created</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>One new module on this track named whatever you specify below.</li>
          <li>One lesson per .docx file — title from the file&apos;s first heading or filename.</li>
          <li>
            One <span className="font-mono">text</span> resource per lesson holding the
            extracted body. AI tutor and quiz generation will pick it up
            automatically.
          </li>
          <li>
            Estimated minutes per lesson are derived from word count
            (~200 words per minute).
          </li>
        </ul>
      </div>
    </div>
  );
}
