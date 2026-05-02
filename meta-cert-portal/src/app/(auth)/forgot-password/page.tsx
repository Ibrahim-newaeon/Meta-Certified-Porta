import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/shared/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Enter the email on your account and we&apos;ll send a link you can use to set a
        new password.
      </p>

      <ForgotPasswordForm />

      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        Remembered it?{' '}
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
