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

const ModulePatch = z.object({
  title: z.string().min(2).max(160).optional(),
  description: z.string().max(2000).optional().or(z.literal('').transform(() => undefined)),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export async function updateModuleAction(_: Result, fd: FormData): Promise<Result> {
  const { supabase } = await requireRole('admin');
  const id = String(fd.get('id') ?? '');
  const trackId = String(fd.get('trackId') ?? '');
  z.string().uuid().parse(id);
  z.string().uuid().parse(trackId);

  const parsed = ModulePatch.safeParse({
    title: fd.get('title') ?? undefined,
    description: fd.get('description') ?? undefined,
    orderIndex: fd.get('orderIndex') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const d = parsed.data;

  const { error } = await supabase
    .from('modules')
    .update({
      title: d.title,
      description: d.description,
      order_index: d.orderIndex,
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/tracks/${trackId}`);
  return { ok: true };
}

export async function reorderModuleAction(
  id: string,
  trackId: string,
  direction: 'up' | 'down'
): Promise<Result> {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  z.string().uuid().parse(trackId);
  z.enum(['up', 'down']).parse(direction);

  const { data: rows } = await supabase
    .from('modules')
    .select('id, order_index')
    .eq('track_id', trackId)
    .order('order_index');
  if (!rows) return { error: 'Could not load modules' };

  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { error: 'Module not found' };
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return { ok: true };

  const a = rows[idx];
  const b = rows[swapIdx];
  // Use a temporary out-of-range value to avoid unique-index conflicts on (track_id, order_index)
  await supabase.from('modules').update({ order_index: -1 }).eq('id', a.id);
  await supabase.from('modules').update({ order_index: a.order_index }).eq('id', b.id);
  const { error } = await supabase.from('modules').update({ order_index: b.order_index }).eq('id', a.id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/tracks/${trackId}`);
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
