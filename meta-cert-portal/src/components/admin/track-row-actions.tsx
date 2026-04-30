'use client';
import { useTransition } from 'react';
import { togglePublishedAction, deleteTrackAction } from '@/app/admin/tracks/actions';

export function PublishToggle({ id, isPublished }: { id: string; isPublished: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => togglePublishedAction(id, !isPublished).then(() => {}))}
      disabled={pending}
      className={`rounded-md px-2 py-1 text-xs font-medium ${
        isPublished
          ? 'bg-green-100 text-green-800 hover:bg-green-200'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {isPublished ? 'Published' : 'Draft'}
    </button>
  );
}

export function DeleteTrackButton({ id, code }: { id: string; code: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm(`Delete track ${code}? This removes all modules, lessons, resources.`)) return;
        start(() => deleteTrackAction(id).then(() => {}));
      }}
      disabled={pending}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
