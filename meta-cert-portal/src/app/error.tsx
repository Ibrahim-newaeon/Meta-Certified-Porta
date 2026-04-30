'use client';
// Top-level error boundary. Catches any unhandled error from a route segment
// and renders a generic fallback. Per Next docs, this MUST be a Client
// Component because it uses error/reset props from React.
import { useEffect } from 'react';

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
      <p className="text-sm text-slate-600">
        We hit an unexpected error. Try again, and if it keeps happening let us know.
      </p>
      {error.digest && (
        <p className="font-mono text-xs text-slate-400">ref: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="inline-flex h-10 items-center rounded-md bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
      >
        Try again
      </button>
    </div>
  );
}
