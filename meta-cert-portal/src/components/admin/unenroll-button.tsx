'use client';
import { useTransition } from 'react';
import { unenrollUserAction } from '@/app/admin/enrollments/actions';

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
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm(`Unenroll ${email} from ${trackCode}?`)) return;
        start(() => unenrollUserAction(userId, trackId).then(() => {}));
      }}
      disabled={pending}
      className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50"
    >
      Unenroll
    </button>
  );
}
