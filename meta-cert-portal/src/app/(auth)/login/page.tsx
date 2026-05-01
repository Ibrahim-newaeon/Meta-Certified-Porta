import { LoginForm } from '@/components/shared/login-form';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect, error } = await searchParams;

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

      <LoginForm redirectTo={redirect} />
    </div>
  );
}
