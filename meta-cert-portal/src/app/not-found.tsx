import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-semibold">404 — Not found</h1>
      <p className="text-sm text-slate-600">
        That page doesn&apos;t exist, or you don&apos;t have access to it.
      </p>
      <div className="flex gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-4 text-sm hover:bg-slate-50"
        >
          Home
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
        >
          Dashboard
        </Link>
      </div>
    </div>
  );
}
