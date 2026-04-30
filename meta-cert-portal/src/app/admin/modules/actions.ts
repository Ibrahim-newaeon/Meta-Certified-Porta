'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';

const ModuleInput = z.object({
  trackId: z.string().uuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional(),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

type Result = { error?: string; ok?: boolean } | null;

export async function createModuleAction(_: Result, fd: FormData): Promise<Result> {
  const { supabase } = await requireRole('admin');
  const parsed = ModuleInput.safeParse({
    trackId: fd.get('trackId'),
    title: fd.get('title'),
    description: fd.get('description') || undefined,
    orderIndex: fd.get('orderIndex') ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const d = parsed.data;
  const { error } = await supabase.from('modules').insert({
    track_id: d.trackId,
    title: d.title,
    description: d.description,
    order_index: d.orderIndex,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/tracks/${d.trackId}`);
  return { ok: true };
}

export async function deleteModuleAction(id: string, trackId: string) {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  z.string().uuid().parse(trackId);
  const { error } = await supabase.from('modules').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/tracks/${trackId}`);
}
