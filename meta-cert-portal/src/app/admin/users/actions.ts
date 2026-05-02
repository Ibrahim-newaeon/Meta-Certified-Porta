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

export async function deleteUserAction(userId: string): Promise<Result> {
  const { user } = await requireRole('admin');
  z.string().uuid().parse(userId);

  // SECURITY: prevent admin from deleting themselves (would lose admin access)
  if (userId === user.id) {
    return { error: 'You cannot delete your own account.' };
  }

  const admin = createAdminClient();
  // SECURITY: service-role only used after the requireRole gate. Cascading FKs
  // on enrollments/progress/quiz_attempts/profiles handle the dependent rows.
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath('/admin/users');
  return { ok: true };
}

const SetPassword = z.object({
  password: z.string().min(8).max(128),
});

export async function setUserPasswordAction(
  userId: string,
  password: string,
): Promise<Result> {
  await requireRole('admin');
  z.string().uuid().parse(userId);
  const parsed = SetPassword.safeParse({ password });
  if (!parsed.success) {
    return { error: 'Password must be 8–128 characters.' };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(userId, {
    password: parsed.data.password,
  });
  if (error) return { error: error.message };
  return { ok: true };
}

export async function sendPasswordResetForUserAction(
  userId: string,
): Promise<Result> {
  await requireRole('admin');
  z.string().uuid().parse(userId);

  const admin = createAdminClient();
  const { data: target, error: lookupErr } = await admin.auth.admin.getUserById(userId);
  if (lookupErr || !target?.user?.email) {
    return { error: lookupErr?.message ?? 'User not found.' };
  }

  const redirectTo = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback?next=/reset-password`;
  const { error } = await admin.auth.resetPasswordForEmail(target.user.email, {
    redirectTo,
  });
  if (error) return { error: error.message };
  return { ok: true };
}
