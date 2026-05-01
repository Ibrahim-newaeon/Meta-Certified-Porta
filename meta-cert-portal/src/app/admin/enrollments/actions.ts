'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

type Result = { error?: string; ok?: boolean } | null;

export async function unenrollUserAction(userId: string, trackId: string): Promise<Result> {
  await requireRole('admin');
  z.string().uuid().parse(userId);
  z.string().uuid().parse(trackId);
  const admin = createAdminClient();
  const { error } = await admin
    .from('enrollments')
    .delete()
    .eq('user_id', userId)
    .eq('track_id', trackId);
  if (error) return { error: error.message };
  revalidatePath('/admin/enrollments');
  return { ok: true };
}
