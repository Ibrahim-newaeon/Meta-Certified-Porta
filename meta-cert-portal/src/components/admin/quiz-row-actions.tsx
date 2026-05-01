'use client';
import { useTransition } from 'react';
import { deleteQuizAction } from '@/app/admin/quizzes/actions';

export function DeleteQuizButton({ id, title }: { id: string; title: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm(`Delete quiz "${title}" and all its questions?`)) return;
        start(() => deleteQuizAction(id).then(() => {}));
      }}
      disabled={pending}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      Delete
    </button>
  );
}
