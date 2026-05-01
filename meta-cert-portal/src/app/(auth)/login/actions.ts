'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const Creds = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  redirectTo: z.string().optional(),
});

export type ActionResult = { error?: string; ok?: boolean } | null;

export async function signInAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = Creds.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    redirectTo: formData.get('redirectTo') ?? undefined,
  });
  if (!parsed.success) return { error: 'Invalid credentials' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  // SECURITY: generic error to avoid email-enumeration
  if (error) return { error: 'Email or password is incorrect.' };

  redirect(parsed.data.redirectTo ?? '/dashboard');
}

const Email = z.object({ email: z.string().email() });

export async function sendMagicLinkAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = Email.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { error: 'Enter a valid email' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
