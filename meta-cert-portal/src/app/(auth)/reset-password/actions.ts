'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type ActionResult = { error?: string; ok?: boolean } | null;

const NewPassword = z.object({
  password: z.string().min(8).max(128),
});

export async function setNewPasswordAction(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = NewPassword.safeParse({ password: formData.get('password') });
  if (!parsed.success) return { error: 'Password must be 8–128 characters.' };

  const supabase = await createClient();
  // SECURITY: this only succeeds if the caller has a valid recovery session,
  // which Supabase Auth grants only after consuming a valid recovery code via
  // /auth/callback. No additional gating needed.
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };

  // Sign the recovery session out so the user has to log in fresh with the new password.
  await supabase.auth.signOut();
  redirect('/login?reset=ok');
}
