'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';

const LessonInput = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(2).max(200),
  summary: z.string().max(2000).optional(),
  orderIndex: z.coerce.number().int().min(0).default(0),
  estMinutes: z.coerce.number().int().min(1).max(240).default(10),
});

type Result = { error?: string; ok?: boolean } | null;

export async function createLessonAction(_: Result, fd: FormData): Promise<Result> {
  const { supabase } = await requireRole('admin');
  const parsed = LessonInput.safeParse({
    moduleId: fd.get('moduleId'),
    title: fd.get('title'),
    summary: fd.get('summary') || undefined,
    orderIndex: fd.get('orderIndex') ?? 0,
    estMinutes: fd.get('estMinutes') ?? 10,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const d = parsed.data;
  const { data: mod } = await supabase
    .from('modules')
    .select('track_id')
    .eq('id', d.moduleId)
    .single();

  const { error } = await supabase.from('lessons').insert({
    module_id: d.moduleId,
    title: d.title,
    summary: d.summary,
    order_index: d.orderIndex,
    est_minutes: d.estMinutes,
  });
  if (error) return { error: error.message };

  if (mod?.track_id) revalidatePath(`/admin/tracks/${mod.track_id}`);
  return { ok: true };
}

const LessonPatch = z.object({
  title: z.string().min(2).max(200).optional(),
  summary: z.string().max(2000).optional().or(z.literal('').transform(() => undefined)),
  orderIndex: z.coerce.number().int().min(0).optional(),
  estMinutes: z.coerce.number().int().min(1).max(240).optional(),
});

export async function updateLessonAction(_: Result, fd: FormData): Promise<Result> {
  const { supabase } = await requireRole('admin');
  const id = String(fd.get('id') ?? '');
  z.string().uuid().parse(id);

  const parsed = LessonPatch.safeParse({
    title: fd.get('title') ?? undefined,
    summary: fd.get('summary') ?? undefined,
    orderIndex: fd.get('orderIndex') ?? undefined,
    estMinutes: fd.get('estMinutes') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const d = parsed.data;

  const { error } = await supabase
    .from('lessons')
    .update({
      title: d.title,
      summary: d.summary,
      order_index: d.orderIndex,
      est_minutes: d.estMinutes,
    })
    .eq('id', id);
  if (error) return { error: error.message };

  // Look up the track for revalidation
  const { data: lesson } = await supabase
    .from('lessons')
    .select('module_id, modules!inner(track_id)')
    .eq('id', id)
    .single();
  const rawMods = lesson?.modules;
  const modRow = Array.isArray(rawMods)
    ? (rawMods[0] as { track_id: string } | undefined)
    : (rawMods as { track_id: string } | null | undefined);
  if (modRow?.track_id) revalidatePath(`/admin/tracks/${modRow.track_id}`);
  revalidatePath(`/admin/lessons/${id}`);
  return { ok: true };
}

export async function reorderLessonAction(
  id: string,
  moduleId: string,
  trackId: string,
  direction: 'up' | 'down'
): Promise<Result> {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  z.string().uuid().parse(moduleId);
  z.string().uuid().parse(trackId);
  z.enum(['up', 'down']).parse(direction);

  const { data: rows } = await supabase
    .from('lessons')
    .select('id, order_index')
    .eq('module_id', moduleId)
    .order('order_index');
  if (!rows) return { error: 'Could not load lessons' };

  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { error: 'Lesson not found' };
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return { ok: true };

  const a = rows[idx];
  const b = rows[swapIdx];
  await supabase.from('lessons').update({ order_index: -1 }).eq('id', a.id);
  await supabase.from('lessons').update({ order_index: a.order_index }).eq('id', b.id);
  const { error } = await supabase.from('lessons').update({ order_index: b.order_index }).eq('id', a.id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/tracks/${trackId}`);
  return { ok: true };
}

export async function deleteLessonAction(id: string, trackId: string) {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  const { error } = await supabase.from('lessons').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath(`/admin/lessons/${id}`);
}

const BulkDeleteInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  trackId: z.string().uuid(),
});

export async function bulkDeleteLessonsAction(
  ids: string[],
  trackId: string,
): Promise<{ ok?: boolean; error?: string; deleted?: number }> {
  const { supabase } = await requireRole('admin');
  const parsed = BulkDeleteInput.safeParse({ ids, trackId });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const { error, count } = await supabase
    .from('lessons')
    .delete({ count: 'exact' })
    .in('id', parsed.data.ids);
  if (error) return { error: error.message };

  revalidatePath(`/admin/tracks/${trackId}`);
  return { ok: true, deleted: count ?? parsed.data.ids.length };
}
