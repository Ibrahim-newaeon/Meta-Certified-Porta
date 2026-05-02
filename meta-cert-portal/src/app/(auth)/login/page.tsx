import Link from 'next/link';
import { LoginForm } from '@/components/shared/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string; reset?: string }>;
}) {
  const { redirect, error, reset } = await searchParams;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Sign in to Meta Cert Portal
      </h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Use your email + password, or get a magic link in your inbox.
      </p>

      {error === 'auth' && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm text-[var(--color-danger-fg)]"
        >
          That sign-in link was invalid or expired. Try again.
        </div>
      )}
      {reset === 'ok' && (
        <div
          role="status"
          className="mb-4 rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm text-[var(--color-success-fg)]"
        >
          Password updated. Sign in with your new password below.
        </div>
      )}

      <LoginForm redirectTo={redirect} />

      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        New here?{' '}
        <Link
          href="/register"
          className="font-medium text-[var(--color-brand-soft-fg)] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
