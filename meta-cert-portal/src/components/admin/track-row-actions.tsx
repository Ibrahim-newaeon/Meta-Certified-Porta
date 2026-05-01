'use client';
import { useTransition } from 'react';
import { togglePublishedAction, deleteTrackAction } from '@/app/admin/tracks/actions';
import { ConfirmButton } from '@/components/shared/confirm-button';

export function PublishToggle({ id, isPublished }: { id: string; isPublished: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={isPublished}
      aria-label={
        isPublished ? 'Unpublish track (currently published)' : 'Publish track (currently draft)'
      }
      onClick={() => start(() => togglePublishedAction(id, !isPublished).then(() => {}))}
      disabled={pending}
      className={`inline-flex h-9 items-center rounded-md px-3 text-xs font-medium transition-colors disabled:opacity-50 ${
        isPublished
          ? 'bg-[var(--color-success-bg)] text-[var(--color-success-fg)] hover:brightness-95'
          : 'bg-[var(--color-neutral-bg)] text-[var(--color-neutral-fg)] hover:bg-[var(--color-neutral-hover)]'
      }`}
    >
      {isPublished ? 'Published' : 'Draft'}
    </button>
  );
}

export function DeleteTrackButton({ id, code }: { id: string; code: string }) {
  return (
    <ConfirmButton
      label="Delete"
      title={`Delete track ${code}?`}
      description="This removes all modules, lessons, and resources. This cannot be undone."
      confirmLabel="Delete track"
      variant="danger"
      triggerSize="sm"
      onConfirm={async () => {
        await deleteTrackAction(id);
      }}
    />
  );
}
