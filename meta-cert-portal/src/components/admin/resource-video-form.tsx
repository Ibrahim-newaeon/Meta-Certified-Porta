'use client';
import { useState, useTransition } from 'react';
import { createMuxUploadAction } from '@/app/admin/resources/actions';

export function ResourceVideoForm({ lessonId }: { lessonId: string }) {
  const [pending, start] = useTransition();
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

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

    // PUT the video to Mux's signed upload URL.
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
          'Uploaded to Mux. Once Mux finishes encoding, the webhook will populate the playback id and the resource will become viewable.'
        );
        setTimeout(() => window.location.reload(), 1500);
      } else {
        setError(`Upload failed: HTTP ${xhr.status}`);
      }
    };
    xhr.onerror = () => setError('Upload failed (network)');
    xhr.send(file);
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
        <label className="text-xs font-medium text-slate-600">Video file</label>
        <input
          name="file"
          type="file"
          accept="video/*"
          required
          className="mt-1 block w-full text-sm"
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
      {ok && <p className="text-sm text-green-600">{ok}</p>}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
      >
        {pending ? 'Uploading…' : 'Upload video'}
      </button>
    </form>
  );
}
