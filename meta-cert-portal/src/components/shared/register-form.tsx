'use client';
import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { signUpAction, type ActionResult } from '@/app/(auth)/register/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
    >
      {pending ? 'Creating account…' : 'Create account'}
    </button>
  );
}

export function RegisterForm() {
  const [state, action] = useActionState<ActionResult, FormData>(signUpAction, null);

  if (state?.needsConfirmation) {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
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
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          className="block h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="block h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:outline-none"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="block h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <p className="text-xs text-slate-500">At least 8 characters.</p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <SubmitButton />
    </form>
  );
}
