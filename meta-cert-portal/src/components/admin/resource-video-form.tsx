'use client';
import { useId, useState, useTransition } from 'react';
import { createMuxUploadAction } from '@/app/admin/resources/actions';
import { Button } from '@/components/shared/button';
import { Input, FieldLabel } from '@/components/shared/input';

export function ResourceVideoForm({ lessonId }: { lessonId: string }) {
  const [pending, start] = useTransition();
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const titleId = useId();
  const fileId = useId();

  async function onSubmit(fd: FormData) {
    setError(null);
    setOk(null);

    const title = String(fd.get('title') ?? '').trim();
    const file = fd.get('file') as File | null;
    if (!title) return setError('Title required');
    if (!file) return setError('Choose a video file');

    const res = await createMuxUploadAction(lessonId, title);
    if ('error' in res || !res.uploadUrl) {
      return setError('error' in res ? (res.error ?? 'Failed to create upload') : 'Failed to create upload');
    }

    setPct(10);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', res.uploadUrl);
    xhr.upload.onprogress = (ev) => {
      if (ev.lengthComputable) {
        setPct(10 + Math.round((ev.loaded / ev.total) * 85));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setPct(100);
        setOk(
          'Uploaded to Mux. Once Mux finishes encoding, the webhook will populate the playback id and the resource will become viewable.',
        );
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(`Upload failed: HTTP ${xhr.status}`);
      }
    };
    xhr.onerror = () => setError('Upload failed (network)');
    xhr.send(file);
  }

  const pendingLabel =
    pct === 0 ? 'Preparing…' : pct < 100 ? `Uploading… ${pct}%` : 'Finalising…';

  return (
    <form
      action={(fd) => start(() => onSubmit(fd))}
      className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4"
    >
      <div>
        <FieldLabel htmlFor={titleId}>Title</FieldLabel>
        <Input id={titleId} name="title" required className="mt-1" />
      </div>
      <div>
        <FieldLabel htmlFor={fileId}>Video file</FieldLabel>
        <input
          id={fileId}
          name="file"
          type="file"
          accept="video/*"
          required
          className="mt-1 block w-full text-sm file:mr-3 file:h-10 file:rounded-md file:border-0 file:bg-[var(--color-primary)] file:px-3 file:text-xs file:font-medium file:text-[var(--color-primary-fg)] hover:file:bg-[var(--color-primary-hover)]"
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
          {ok}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? pendingLabel : 'Upload video'}
      </Button>
    </form>
  );
}
