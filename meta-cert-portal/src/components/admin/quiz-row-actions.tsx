'use client';
import { deleteQuizAction } from '@/app/admin/quizzes/actions';
import { ConfirmButton } from '@/components/shared/confirm-button';

export function DeleteQuizButton({ id, title }: { id: string; title: string }) {
  return (
    <ConfirmButton
      label="Delete"
      title={`Delete quiz "${title}"?`}
      description="All questions in this quiz will be removed. This cannot be undone."
      confirmLabel="Delete quiz"
      variant="danger"
      triggerSize="sm"
      onConfirm={async () => {
        await deleteQuizAction(id);
      }}
    />
  );
}
