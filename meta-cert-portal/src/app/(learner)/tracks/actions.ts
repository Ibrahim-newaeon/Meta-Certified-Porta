'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/roles';

type Result = { error?: string; ok?: boolean } | null;

export async function enrollAction(trackId: string): Promise<Result> {
  const { user, supabase } = await requireUser();
  z.string().uuid().parse(trackId);

  // SECURITY: RLS "enrollments_self_insert" enforces user_id = auth.uid()
  const { error } = await supabase
    .from('enrollments')
    .insert({ user_id: user.id, track_id: trackId });

  if (error && !error.message.toLowerCase().includes('duplicate')) {
    return { error: error.message };
  }
  revalidatePath('/dashboard');
  revalidatePath(`/tracks/${trackId}`);
  return { ok: true };
}

export async function unenrollAction(trackId: string): Promise<Result> {
  const { user, supabase } = await requireUser();
  z.string().uuid().parse(trackId);

  const { error } = await supabase
    .from('enrollments')
    .delete()
    .eq('user_id', user.id)
    .eq('track_id', trackId);

  if (error) return { error: error.message };
  revalidatePath('/dashboard');
  revalidatePath(`/tracks/${trackId}`);
  return { ok: true };
}
