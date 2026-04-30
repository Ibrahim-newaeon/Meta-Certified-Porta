'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { createTrackAction } from '@/app/admin/tracks/actions';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Create track'}
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
        <Submit />
      </div>
    </form>
  );
}
