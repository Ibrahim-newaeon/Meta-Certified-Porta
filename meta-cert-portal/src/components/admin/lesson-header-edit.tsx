'use client';
import { useState, useTransition } from 'react';
import { updateLessonAction } from '@/app/admin/lessons/actions';

export function LessonHeaderEdit({
  lesson,
  trackId,
}: {
  lesson: {
    id: string;
    title: string;
    summary: string | null;
    est_minutes: number | null;
    order_index: number;
  };
  trackId: string;
}) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex h-8 items-center rounded-md border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-50"
      >
        Edit lesson info
      </button>
    );
  }

  return (
    <form
      action={(fd) => {
        setError(null);
        start(async () => {
          const res = await updateLessonAction(null, fd);
          if (res?.error) setError(res.error);
          else setEditing(false);
        });
      }}
      className="space-y-3 rounded-lg border bg-slate-50 p-4"
    >
      <input type="hidden" name="id" value={lesson.id} />
      <input type="hidden" name="trackId" value={trackId} />
      <div>
        <label className="text-xs font-medium text-slate-600">Title</label>
        <input
          name="title"
          defaultValue={lesson.title}
          required
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Summary</label>
        <textarea
          name="summary"
          defaultValue={lesson.summary ?? ''}
          rows={3}
          className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Order</label>
          <input
            name="orderIndex"
            type="number"
            defaultValue={lesson.order_index}
            className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-slate-600">Est minutes</label>
          <input
            name="estMinutes"
            type="number"
            defaultValue={lesson.est_minutes ?? 10}
            className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="inline-flex h-9 items-center rounded-md border border-slate-300 px-4 text-sm hover:bg-white"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
