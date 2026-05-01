import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">404 — Not found</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-4 text-sm transition-colors hover:bg-[var(--surface-muted)]"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-11 items-center rounded-md bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-primary-fg)] transition-colors hover:bg-[var(--color-primary-hover)]"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
