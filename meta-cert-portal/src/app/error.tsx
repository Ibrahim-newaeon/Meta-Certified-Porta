'use client';
import { useEffect } from 'react';
import { Button } from '@/components/shared/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // SECURITY: do not log error.message — may contain user data. Digest
    // is the public correlation ID surfaced by Next + Vercel.
    console.error('app error', { digest: error.digest });
  }, [error.digest]);

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        We hit an unexpected error. Try again, and if it keeps happening let us know.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-[var(--color-text-subtle)]">ref: {error.digest}</p>
      )}
      <Button size="lg" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
