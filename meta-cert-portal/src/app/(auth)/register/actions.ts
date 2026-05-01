'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

const SignUp = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  fullName: z.string().min(1).max(120).optional(),
});

export type ActionResult = { error?: string; ok?: boolean; needsConfirmation?: boolean } | null;

export async function signUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = SignUp.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    fullName: (formData.get('fullName') as string | null)?.trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined,
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
    },
  });
  if (error) return { error: error.message };

  // If a session is returned the user is already signed in — go to dashboard.
  if (data.session) redirect('/dashboard');

  // Otherwise email confirmation is required.
  return { ok: true, needsConfirmation: true };
}
