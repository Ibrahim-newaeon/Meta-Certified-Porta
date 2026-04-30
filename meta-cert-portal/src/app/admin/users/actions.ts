'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

type Result = { error?: string; ok?: boolean } | null;

export async function setRoleAction(
  userId: string,
  role: 'admin' | 'learner'
): Promise<Result> {
  const { user } = await requireRole('admin');
  z.string().uuid().parse(userId);
  z.enum(['admin', 'learner']).parse(role);

  // SECURITY: prevent admin lockout
  if (userId === user.id && role !== 'admin') {
    return { error: 'You cannot demote yourself.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}

const Invite = z.object({
  email: z.string().email(),
  role: z.enum(['admin', 'learner']).default('learner'),
});

export async function inviteUserAction(_: Result, fd: FormData): Promise<Result> {
  await requireRole('admin');
  const parsed = Invite.safeParse({
    email: fd.get('email'),
    role: fd.get('role') ?? 'learner',
  });
  if (!parsed.success) return { error: 'Enter a valid email' };

  const admin = createAdminClient();
  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`;

  // SECURITY: service-role only used after the requireRole gate
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo,
  });
  if (error) return { error: error.message };

  if (parsed.data.role === 'admin' && data.user) {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }
  revalidatePath('/admin/users');
  return { ok: true };
}
