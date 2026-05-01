'use client';
import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { createTrackAction, updateTrackAction } from '@/app/admin/tracks/actions';

function Submit({ idleLabel = 'Save' }: { idleLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? 'Saving…' : idleLabel}
    </button>
  );
}

export function TrackCreateForm() {
  const [state, action] = useActionState(createTrackAction, null);

  return (
    <form action={action} className="grid grid-cols-1 gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
      <div>
        <label className="text-xs font-medium text-slate-600">Code (e.g. MCMBP)</label>
        <input
          name="code"
          required
          maxLength={8}
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm uppercase"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Slug</label>
        <input
          name="slug"
          required
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm lowercase"
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-medium text-slate-600">Title</label>
        <input
          name="title"
          required
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-xs font-medium text-slate-600">Description</label>
        <textarea
          name="description"
          rows={3}
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Exam minutes</label>
        <input
          name="examMinutes"
          type="number"
          defaultValue={75}
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Pass score (%)</label>
        <input
          name="passScore"
          type="number"
          defaultValue={70}
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" name="isPublished" />
        Publish immediately
      </label>
      {state?.error && <p className="text-sm text-red-600 md:col-span-2">{state.error}</p>}
      <div className="md:col-span-2">
        <Submit idleLabel="Create track" />
      </div>
    </form>
  );
}

export type TrackEditValues = {
  id: string;
  code: string;
  title: string;
  slug: string;
  description: string | null;
  examMinutes: number;
  passScore: number;
};

export function TrackEditButton({ track }: { track: TrackEditValues }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-slate-600 hover:text-slate-900"
      >
        Edit
      </button>
      {open && <TrackEditDialog track={track} onClose={() => setOpen(false)} />}
    </>
  );
}

function TrackEditDialog({
  track,
  onClose,
}: {
  track: TrackEditValues;
  onClose: () => void;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-lg bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Edit track</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <form
          action={(fd) => {
            setError(null);
            start(async () => {
              const res = await updateTrackAction(track.id, {
                code: String(fd.get('code') ?? ''),
                title: String(fd.get('title') ?? ''),
                slug: String(fd.get('slug') ?? ''),
                description: String(fd.get('description') ?? ''),
                examMinutes: Number(fd.get('examMinutes') ?? track.examMinutes),
                passScore: Number(fd.get('passScore') ?? track.passScore),
              });
              if (res?.error) setError(res.error);
              else onClose();
            });
          }}
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          <div>
            <label className="text-xs font-medium text-slate-600">Code</label>
            <input
              name="code"
              defaultValue={track.code}
              required
              maxLength={8}
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm uppercase"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Slug</label>
            <input
              name="slug"
              defaultValue={track.slug}
              required
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm lowercase"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-600">Title</label>
            <input
              name="title"
              defaultValue={track.title}
              required
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-600">Description</label>
            <textarea
              name="description"
              defaultValue={track.description ?? ''}
              rows={3}
              className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Exam minutes</label>
            <input
              name="examMinutes"
              type="number"
              defaultValue={track.examMinutes}
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Pass score (%)</label>
            <input
              name="passScore"
              type="number"
              defaultValue={track.passScore}
              className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600 md:col-span-2">{error}</p>}
          <div className="md:col-span-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {pending ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
