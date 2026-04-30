'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { createLinkResourceAction } from '@/app/admin/resources/actions';

const EXAM_CODES = ['MCDMA', 'MCMBP', 'MCMSP', 'MCCM', 'MCCSP', 'MCMDA'];

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-9 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? 'Saving…' : label}
    </button>
  );
}

export function ResourceLinkForm({ lessonId }: { lessonId: string }) {
  const [state, action] = useActionState(createLinkResourceAction, null);
  const [url, setUrl] = useState('');

  return (
    <form action={action} className="space-y-3 rounded-lg border bg-white p-4">
      <input type="hidden" name="lessonId" value={lessonId} />
      <div>
        <label className="text-xs font-medium text-slate-600">Title</label>
        <input
          name="title"
          required
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">URL</label>
        <input
          name="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.facebook.com/business/learn/..."
          className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
        />
      </div>
      <div>
        <label className="text-xs font-medium text-slate-600">Exam tags</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {EXAM_CODES.map((c) => (
            <label key={c} className="flex items-center gap-1.5 text-xs">
              <input type="checkbox" name="examCodes" value={c} />
              <span className="font-mono">{c}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-slate-600">Order</label>
          <input
            name="orderIndex"
            type="number"
            defaultValue={0}
            className="mt-1 block h-9 w-full rounded-md border border-slate-300 px-2 text-sm"
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Submit label="Add link" />
    </form>
  );
}
