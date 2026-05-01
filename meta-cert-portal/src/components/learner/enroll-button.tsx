'use client';
import { useTransition } from 'react';
import { enrollAction, unenrollAction } from '@/app/(learner)/tracks/actions';
import { ConfirmButton } from '@/components/shared/confirm-button';
import { Button } from '@/components/shared/button';

export function EnrollButton({ trackId }: { trackId: string }) {
  const [pending, start] = useTransition();
  return (
    <Button
      size="lg"
      onClick={() => start(() => enrollAction(trackId).then(() => {}))}
      disabled={pending}
    >
      {pending ? 'Enrolling…' : 'Enroll in this track'}
    </Button>
  );
}

export function UnenrollButton({ trackId }: { trackId: string }) {
  return (
    <ConfirmButton
      label="Unenroll"
      title="Unenroll from this track?"
      description="Your progress will be retained, but the track will be removed from your dashboard."
      confirmLabel="Unenroll"
      pendingLabel="Unenrolling…"
      variant="neutral"
      triggerSize="sm"
      onConfirm={async () => {
        await unenrollAction(trackId);
      }}
    />
  );
}
