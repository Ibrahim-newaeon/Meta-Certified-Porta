'use client';
import { useActionState, useId } from 'react';
import { useFormStatus } from 'react-dom';
import {
  setNewPasswordAction,
  type ActionResult,
} from '@/app/(auth)/reset-password/actions';
import { Button } from './button';
import { Input } from './input';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? 'Updating password…' : 'Update password'}
    </Button>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState<ActionResult, FormData>(
    setNewPasswordAction,
    null,
  );
  const passwordId = useId();
  const confirmId = useId();

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor={passwordId} className="block text-sm font-medium">
          New password
        </label>
        <Input
          id={passwordId}
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11"
        />
        <p className="text-xs text-[var(--color-text-subtle)]">At least 8 characters.</p>
      </div>
      <div className="space-y-1.5">
        <label htmlFor={confirmId} className="block text-sm font-medium">
          Confirm new password
        </label>
        <Input
          id={confirmId}
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="h-11"
          // Browser-native confirmation; mismatch is caught client-side via JS below
          onInput={(e) => {
            const form = e.currentTarget.form;
            const pw = form?.elements.namedItem('password') as HTMLInputElement | null;
            e.currentTarget.setCustomValidity(
              pw && pw.value !== e.currentTarget.value ? 'Passwords do not match.' : '',
            );
          }}
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
