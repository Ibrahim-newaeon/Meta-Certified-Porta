# 02 — Auth & Roles

## 1. Goals

- Email/password **and** magic link sign-in via Supabase Auth.
- A `profiles.role` field of `'admin' | 'learner'` is the single source of truth for authorization.
- All route gating happens **twice**: once in `middleware.ts` for fast redirects, once again in the RSC/Server Action via `requireRole()`. Never trust the middleware alone.
- Service role key lives only in `lib/supabase/admin.ts`, used in trusted server contexts (e.g. seeding, cron, webhook handlers).

## 2. Environment variables

`.env.local` (see `.env.local.example` in the repo for the full template):

```bash
# Public — safe to expose to the browser
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# SECURITY: server-only — never import in a 'use client' file
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# SECURITY: server-only
ANTHROPIC_API_KEY=sk-ant-...

# Mux (server-only signing key)
MUX_TOKEN_ID=...
MUX_TOKEN_SECRET=...
MUX_SIGNING_KEY_ID=...
MUX_SIGNING_KEY_PRIVATE=...
```

## 3. Files (already created by setup.sh)

```
src/lib/supabase/
├── client.ts          # browser client (anon key)
├── server.ts          # SSR/RSC/Server Action client (anon key + cookies)
└── admin.ts           # service-role client (server-only, 'server-only' import)

src/middleware.ts      # auth + admin route check
```

## 4. Files to add in this phase

```
src/lib/auth/roles.ts          # requireUser, requireRole, getRole
src/app/(auth)/login/page.tsx
src/app/(auth)/login/actions.ts
src/app/auth/callback/route.ts
src/components/shared/login-form.tsx
```

## 5. `lib/auth/roles.ts`

```ts
import 'server-only';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Role = 'admin' | 'learner';

export async function requireUser() {
  const supabase = await createClient();
  // SECURITY: getUser() validates JWT against Supabase, unlike getSession()
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { user, supabase };
}

export async function requireRole(role: Role) {
  const { user, supabase } = await requireUser();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, full_name, email')
    .eq('id', user.id)
    .single();

  if (error || !profile) redirect('/login');
  // SECURITY: hard fail if role mismatch — never fall back to learner
  if (profile.role !== role) redirect('/dashboard');

  return { user, profile, supabase };
}
```

## 6. `app/(auth)/login/actions.ts`

```ts
'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const Creds = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  next: z.string().optional(),
});

export async function signInAction(_: unknown, formData: FormData) {
  const parsed = Creds.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: 'Invalid credentials' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { error: 'Email or password is incorrect.' }; // SECURITY: generic error

  redirect(parsed.data.next ?? '/dashboard');
}

export async function sendMagicLinkAction(_: unknown, formData: FormData) {
  const email = z.string().email().parse(formData.get('email'));
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });
  if (error) return { error: 'Could not send link. Try again.' };
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
```

## 7. Auth callback

`app/auth/callback/route.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const supabase = await createClient();
    // SECURITY: exchanges single-use code for a session cookie; invalid/expired codes return error
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
```

## 8. Admin bootstrap

The first admin must be promoted manually. There is no UI for self-elevation.

1. User signs up normally with email + password.
2. In Supabase SQL editor, run:
    ```sql
    update public.profiles set role = 'admin' where email = 'you@yourdomain.com';
    ```
3. Sign out and back in. The user can now reach `/admin`.

For follow-up admins, an existing admin uses the **User Management** page (see `03-admin-panel.md`) which calls a Server Action that runs under `supabaseAdmin` (service role) but **only after `requireRole('admin')` succeeds**. This double-check pattern is mandatory.

## 9. Verification checklist

- [ ] Visiting `/admin` while logged out → redirects to `/login?next=/admin`.
- [ ] Visiting `/admin` as a learner → redirects to `/dashboard`.
- [ ] `requireRole('admin')` in an RSC page rejects a tampered cookie session.
- [ ] `update profiles set role='admin'` from an authenticated learner's session fails (RLS check policy).
- [ ] Magic link arrives within 30 s and lands on `/dashboard`.

## Claude Project Prompt

> Using `02-auth-and-roles.md`, scaffold `src/lib/auth/roles.ts`, `src/app/(auth)/login/{page,actions}.tsx`, `src/app/auth/callback/route.ts`, and `src/components/shared/login-form.tsx`. The Supabase clients and middleware are already created. Use shadcn/ui Tabs, Input, Label, Button. After generation, write a Playwright test that verifies: (1) a logged-out user is redirected from `/admin`; (2) a learner cannot reach `/admin` and gets redirected to `/dashboard`; (3) a successful login lands on `/dashboard`.
