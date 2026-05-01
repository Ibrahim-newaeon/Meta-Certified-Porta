'use client';
import { useId, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import { finalizePdfResourceAction } from '@/app/admin/resources/actions';
import { Button } from '@/components/shared/button';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB
const INPUT_CLS =
  'mt-1 block h-10 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-2 text-sm text-[var(--color-text)] focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/20 focus:outline-none';
const LABEL_CLS = 'block text-xs font-medium text-[var(--color-text-muted)]';

export function ResourcePdfForm({ lessonId }: { lessonId: string }) {
  const [pending, start] = useTransition();
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const titleId = useId();
  const fileId = useId();
  const orderId = useId();

  async function onSubmit(fd: FormData) {
    setError(null);
    setOk(false);

    const file = fd.get('file') as File | null;
    const title = String(fd.get('title') ?? '').trim();
    const orderIndex = Number(fd.get('orderIndex') ?? 0);

    if (!file) return setError('Choose a PDF file');
    if (file.type !== 'application/pdf') return setError('PDF only');
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
      await supabase.storage.from('resource-pdfs').remove([path]);
      return setError(res.error);
    }
    setPct(100);
    setOk(true);
    setTimeout(() => window.location.reload(), 600);
  }

  const pendingLabel =
    pct === 0 ? 'Preparing…' : pct < 60 ? `Uploading… ${pct}%` : pct < 100 ? 'Saving…' : 'Done';

  return (
    <form
      action={(fd) => start(() => onSubmit(fd))}
      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div>
        <label htmlFor={titleId} className={LABEL_CLS}>
          Title
        </label>
        <input id={titleId} name="title" required className={INPUT_CLS} />
      </div>
      <div>
        <label htmlFor={fileId} className={LABEL_CLS}>
          PDF file (max 50 MB)
        </label>
        <input
          id={fileId}
          name="file"
          type="file"
          accept="application/pdf"
          required
          className="mt-1 block w-full text-sm file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-3 file:text-xs file:font-medium file:text-[var(--color-primary-fg)] hover:file:bg-[var(--color-primary-hover)]"
        />
      </div>
      <div>
        <label htmlFor={orderId} className={LABEL_CLS}>
          Order
        </label>
        <input
          id={orderId}
          name="orderIndex"
          type="number"
          defaultValue={0}
          className={INPUT_CLS}
        />
      </div>
      {pct > 0 && (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label="Upload progress"
          className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-muted)]"
        >
          <div
            className="h-full origin-left bg-[var(--color-primary)] transition-transform duration-200"
            style={{ transform: `scaleX(${pct / 100})` }}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      {ok && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
          Uploaded — refreshing…
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? pendingLabel : 'Upload PDF'}
      </Button>
    </form>
  );
}
