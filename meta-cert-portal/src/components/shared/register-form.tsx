'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signUpAction, type ActionResult } from '@/app/(auth)/register/actions';
import { Input } from '@/components/shared/input';
import { cn } from '@/lib/cn';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--color-brand)] px-4 text-sm font-medium text-[var(--color-brand-fg-on)] transition-colors hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
    >
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<ActionResult, FormData>(signUpAction, null);

  if (state?.needsConfirmation) {
    return (
      <div
        role="status"
        className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4 text-sm text-[var(--color-success-fg)]"
      >
        Account created. Check your inbox for the confirmation link to activate your
        login.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="fullName" className="text-sm font-medium">
          Full name
        </label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className={cn('h-11')}
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11"
        />
        <p className="text-xs text-[var(--color-text-subtle)]">At least 8 characters.</p>
      </div>
      {state?.error && (
        <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
