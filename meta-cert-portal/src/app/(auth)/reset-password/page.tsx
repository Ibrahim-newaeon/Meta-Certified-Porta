import Link from 'next/link';
import { ResetPasswordForm } from '@/components/shared/reset-password-form';

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Pick a new password for your account. You&apos;ll be signed out afterwards
        so you can log in with it.
      </p>

      <ResetPasswordForm />

      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        Don&apos;t need to reset?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--color-brand-soft-fg)] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
