'use client';
import { useTransition } from 'react';
import { enrollAction, unenrollAction } from '@/app/(learner)/tracks/actions';

export function EnrollButton({ trackId }: { trackId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => start(() => enrollAction(trackId).then(() => {}))}
      disabled={pending}
      className="inline-flex h-10 items-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? 'Enrolling…' : 'Enroll in this track'}
    </button>
  );
}

export function UnenrollButton({ trackId }: { trackId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('Unenroll from this track? Your progress will be retained.')) return;
        start(() => unenrollAction(trackId).then(() => {}));
      }}
      disabled={pending}
      className="text-xs text-slate-500 hover:text-slate-700 disabled:opacity-50"
    >
      Unenroll
    </button>
  );
}
