'use client';
import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import {
  requestPasswordResetAction,
  type ActionResult,
} from '@/app/(auth)/login/actions';
import { Button } from './button';
import { Input } from './input';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? 'Sending reset link…' : 'Send reset link'}
    </Button>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState<ActionResult, FormData>(
    requestPasswordResetAction,
    null,
  );
  const emailId = useId();

  if (state?.ok) {
    return (
      <div
        role="status"
        className="rounded-md border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-4 text-sm text-[var(--color-success-fg)]"
      >
        If that email is on file, we&apos;ve sent a reset link. Check your inbox (and
        spam folder). The link expires in an hour.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={emailId} className="block text-sm font-medium">
          Email
        </label>
        <Input
          id={emailId}
          name="email"
          type="email"
          required
          autoComplete="email"
          className="h-11"
        />
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
