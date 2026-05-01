'use client';
import { deleteResourceAction } from '@/app/admin/resources/actions';
import { ConfirmButton } from '@/components/shared/confirm-button';

export function DeleteResourceButton({ id, lessonId }: { id: string; lessonId: string }) {
  return (
    <ConfirmButton
      label="Delete"
      title="Delete resource?"
      description="Storage / Mux assets will also be removed. This cannot be undone."
      confirmLabel="Delete resource"
      variant="danger"
      triggerSize="sm"
      onConfirm={async () => {
        await deleteResourceAction(id, lessonId);
      }}
    />
  );
}
