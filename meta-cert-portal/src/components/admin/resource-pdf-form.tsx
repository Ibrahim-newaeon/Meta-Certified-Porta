'use client';
import { useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { finalizePdfResourceAction } from '@/app/admin/resources/actions';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export function ResourcePdfForm({ lessonId }: { lessonId: string }) {
  const [pending, start] = useTransition();
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(fd: FormData) {
    setError(null);
    setOk(false);

    const file = fd.get('file') as File | null;
    const title = String(fd.get('title') ?? '').trim();
    const orderIndex = Number(fd.get('orderIndex') ?? 0);

    if (!file) return setError('Choose a PDF file');
    if (file.type !== 'application/pdf') return setError('PDF only');
    // SECURITY: client-side size guard. Storage policy + bucket settings cap server-side.
    if (file.size > MAX_BYTES) return setError(`Max ${MAX_BYTES / 1024 / 1024} MB`);

    const supabase = createClient();
    const path = `${lessonId}/${crypto.randomUUID()}.pdf`;

    setPct(10);
    const { error: upErr } = await supabase.storage
      .from('resource-pdfs')
      .upload(path, file, { contentType: 'application/pdf', upsert: false });

    if (upErr) return setError(upErr.message);
    setPct(60);

    const res = await finalizePdfResourceAction({
      lessonId,
      title,
      bucket: 'resource-pdfs',
      path,
      orderIndex,
    });
    if (res?.error) {
      // Try to clean up the orphaned object
      await supabase.storage.from('resource-pdfs').remove([path]);
      return setError(res.error);
    }
    setPct(100);
    setOk(true);
    // Reload to show the new resource
    setTimeout(() => window.location.reload(), 600);
  }

  return (
    <form
      action={(fd) => start(() => onSubmit(fd))}
      className="space-y-3 rounded-lg border bg-white p-4"
    >
      <div>
        <label className="text-xs font-medium text-slate-600">Title</label>
        <input
          name="title"
          required
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">PDF file (max 50 MB)</label>
        <input
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="mt-1 block w-full text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Order</label>
        <input
          name="orderIndex"
          type="number"
          defaultValue={0}
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      {pct > 0 && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-slate-900 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {ok && <p className="text-sm text-green-600">Uploaded — refreshing…</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? 'Uploading…' : 'Upload PDF'}
      </button>
    </form>
  );
}
