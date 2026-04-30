'use client';
import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import {
  signInAction,
  sendMagicLinkAction,
  type ActionResult,
} from '@/app/(auth)/login/actions';

// NOTE: shadcn/ui isn't installed (registry blocked in setup environment).
// These components use plain HTML + Tailwind classes that mirror shadcn naming
// so swapping in real shadcn <Button>, <Input>, <Label>, <Tabs> is a one-line
// import change once `shadcn add` runs locally.

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 w-full items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? 'Working…' : children}
    </button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [tab, setTab] = useState<'password' | 'magic'>('password');
  const [pwState, pwAction] = useActionState<ActionResult, FormData>(signInAction, null);
  const [mlState, mlAction] = useActionState<ActionResult, FormData>(sendMagicLinkAction, null);

  return (
    <div className="w-full">
      <div role="tablist" className="mb-4 grid grid-cols-2 rounded-md bg-slate-100 p-1 text-sm">
        <button
          role="tab"
          aria-selected={tab === 'password'}
          onClick={() => setTab('password')}
          className={`rounded-md py-1.5 transition ${tab === 'password' ? 'bg-white shadow-sm' : 'text-slate-600'}`}
        >
          Password
        </button>
        <button
          role="tab"
          aria-selected={tab === 'magic'}
          onClick={() => setTab('magic')}
          className={`rounded-md py-1.5 transition ${tab === 'magic' ? 'bg-white shadow-sm' : 'text-slate-600'}`}
        >
          Magic link
        </button>
      </div>

      {tab === 'password' && (
        <form action={pwAction} className="space-y-4">
          {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="block h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="current-password"
              className="block h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          {pwState?.error && <p className="text-sm text-red-600">{pwState.error}</p>}
          <SubmitButton>Sign in</SubmitButton>
        </form>
      )}

      {tab === 'magic' && (
        <form action={mlAction} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="ml-email" className="text-sm font-medium">Email</label>
            <input
              id="ml-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="block h-10 w-full rounded-md border border-slate-300 px-3 text-sm focus:border-slate-500 focus:outline-none"
            />
          </div>
          {mlState?.error && <p className="text-sm text-red-600">{mlState.error}</p>}
          {mlState?.ok && <p className="text-sm text-green-600">Check your inbox for the link.</p>}
          <SubmitButton>Send magic link</SubmitButton>
        </form>
      )}
    </div>
  );
}
