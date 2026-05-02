'use client';
import { useActionState, useId, useState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import {
  signInAction,
  sendMagicLinkAction,
  type ActionResult,
} from '@/app/(auth)/login/actions';
import { Button } from './button';
import { Input } from './input';

function SubmitButton({
  pendingLabel,
  children,
}: {
  pendingLabel: string;
  children: React.ReactNode;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" block disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [tab, setTab] = useState<'password' | 'magic'>('password');
  const [pwState, pwAction] = useActionState<ActionResult, FormData>(signInAction, null);
  const [mlState, mlAction] = useActionState<ActionResult, FormData>(sendMagicLinkAction, null);

  const pwTabId = useId();
  const mlTabId = useId();
  const pwPanelId = useId();
  const mlPanelId = useId();
  const pwEmailId = useId();
  const pwPasswordId = useId();
  const mlEmailId = useId();

  return (
    <div className="w-full">
      <div
        role="tablist"
        aria-label="Sign-in method"
        className="mb-4 grid grid-cols-2 rounded-md bg-[var(--color-neutral-bg)] p-1 text-sm"
      >
        <button
          type="button"
          role="tab"
          id={pwTabId}
          aria-selected={tab === 'password'}
          aria-controls={pwPanelId}
          tabIndex={tab === 'password' ? 0 : -1}
          onClick={() => setTab('password')}
          className={`h-11 rounded-md transition-colors ${
            tab === 'password'
              ? 'bg-[var(--surface)] text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          Password
        </button>
        <button
          type="button"
          role="tab"
          id={mlTabId}
          aria-selected={tab === 'magic'}
          aria-controls={mlPanelId}
          tabIndex={tab === 'magic' ? 0 : -1}
          onClick={() => setTab('magic')}
          className={`h-11 rounded-md transition-colors ${
            tab === 'magic'
              ? 'bg-[var(--surface)] text-[var(--color-text)] shadow-sm'
              : 'text-[var(--color-text-muted)]'
          }`}
        >
          Magic link
        </button>
      </div>

      {tab === 'password' && (
        <form
          action={pwAction}
          role="tabpanel"
          id={pwPanelId}
          aria-labelledby={pwTabId}
          className="space-y-4"
        >
          {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
          <div className="space-y-1.5">
            <label htmlFor={pwEmailId} className="block text-sm font-medium">
              Email
            </label>
            <Input
              id={pwEmailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11"
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor={pwPasswordId} className="block text-sm font-medium">
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-xs text-[var(--color-brand-soft-fg)] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id={pwPasswordId}
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="h-11"
            />
          </div>
          {pwState?.error && (
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
              {pwState.error}
            </p>
          )}
          <SubmitButton pendingLabel="Signing in…">Sign in</SubmitButton>
        </form>
      )}

      {tab === 'magic' && (
        <form
          action={mlAction}
          role="tabpanel"
          id={mlPanelId}
          aria-labelledby={mlTabId}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <label htmlFor={mlEmailId} className="block text-sm font-medium">
              Email
            </label>
            <Input
              id={mlEmailId}
              name="email"
              type="email"
              required
              autoComplete="email"
              className="h-11"
            />
          </div>
          {mlState?.error && (
            <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
              {mlState.error}
            </p>
          )}
          {mlState?.ok && (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-300">
              Check your inbox for the link.
            </p>
          )}
          <SubmitButton pendingLabel="Sending link…">Send magic link</SubmitButton>
        </form>
      )}
    </div>
  );
}
