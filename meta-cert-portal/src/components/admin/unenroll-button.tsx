'use client';
import { unenrollUserAction } from '@/app/admin/enrollments/actions';
import { ConfirmButton } from '@/components/shared/confirm-button';

export function UnenrollButton({
  userId,
  trackId,
  email,
  trackCode,
}: {
  userId: string;
  trackId: string;
  email: string;
  trackCode: string;
}) {
  return (
    <ConfirmButton
      label="Unenroll"
      title={`Unenroll ${email}?`}
      description={`This removes their enrollment in ${trackCode}. Their progress will be archived.`}
      confirmLabel="Unenroll"
      variant="danger"
      triggerSize="sm"
      onConfirm={async () => {
        await unenrollUserAction(userId, trackId);
      }}
    />
  );
}
