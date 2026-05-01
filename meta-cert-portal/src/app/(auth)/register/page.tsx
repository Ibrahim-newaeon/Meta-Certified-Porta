import Link from 'next/link';
import { RegisterForm } from '@/components/shared/register-form';

export default function RegisterPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">
        Create your Meta Cert Portal account
      </h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">
        Start prepping for Meta certifications with structured tracks, video lessons,
        and an AI tutor.
      </p>

      <RegisterForm />

      <p className="mt-6 text-sm text-[var(--color-text-muted)]">
        Already have an account?{' '}
        <Link
          href="/login"
          className="font-medium text-[var(--color-brand-soft-fg)] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
