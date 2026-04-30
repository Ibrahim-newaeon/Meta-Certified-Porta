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
  // Look up the track id so we can revalidate the right page.
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

export async function deleteLessonAction(id: string, trackId: string) {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  const { error } = await supabase.from('lessons').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/tracks/${trackId}`);
  revalidatePath(`/admin/lessons/${id}`);
}
