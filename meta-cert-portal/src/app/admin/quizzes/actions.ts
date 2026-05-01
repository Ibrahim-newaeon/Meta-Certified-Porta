'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

type Result = { error?: string; ok?: boolean } | null;

export async function deleteQuizAction(id: string): Promise<Result> {
  await requireRole('admin');
  z.string().uuid().parse(id);
  // Service role: cascading deletes for questions/options should be handled by FK ON DELETE CASCADE.
  const admin = createAdminClient();
  const { error } = await admin.from('quizzes').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/quizzes');
  return { ok: true };
}
