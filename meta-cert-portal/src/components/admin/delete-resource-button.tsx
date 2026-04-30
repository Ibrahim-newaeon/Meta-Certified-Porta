'use client';
import { useTransition } from 'react';
import { deleteResourceAction } from '@/app/admin/resources/actions';

export function DeleteResourceButton({ id, lessonId }: { id: string; lessonId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm('Delete this resource? Storage / Mux assets will also be removed.')) return;
        start(() => deleteResourceAction(id, lessonId).then(() => {}));
      }}
      disabled={pending}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
