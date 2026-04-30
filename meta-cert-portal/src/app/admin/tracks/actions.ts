'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';

const TrackInput = z.object({
  code: z.string().regex(/^[A-Z]{4,8}$/, 'Use 4-8 uppercase letters'),
  title: z.string().min(3).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Lowercase letters, digits, hyphens'),
  description: z.string().max(2000).optional().or(z.literal('').transform(() => undefined)),
  examMinutes: z.coerce.number().int().min(15).max(240).default(75),
  passScore: z.coerce.number().int().min(50).max(100).default(70),
  isPublished: z.coerce.boolean().default(false),
});

type ActionResult = { error?: string; ok?: boolean } | null;

function fromForm(fd: FormData) {
  return {
    code: String(fd.get('code') ?? '').toUpperCase().trim(),
    title: String(fd.get('title') ?? '').trim(),
    slug: String(fd.get('slug') ?? '').toLowerCase().trim(),
    description: String(fd.get('description') ?? '').trim() || undefined,
    examMinutes: fd.get('examMinutes') ?? 75,
    passScore: fd.get('passScore') ?? 70,
    isPublished: fd.get('isPublished') === 'on',
  };
}

export async function createTrackAction(_: ActionResult, fd: FormData): Promise<ActionResult> {
  const { supabase } = await requireRole('admin');
  const parsed = TrackInput.safeParse(fromForm(fd));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const d = parsed.data;
  // SECURITY: anon-keyed client; RLS "tracks_admin_write" enforces is_admin()
  const { error } = await supabase.from('certification_tracks').insert({
    code: d.code,
    title: d.title,
    slug: d.slug,
    description: d.description,
    exam_minutes: d.examMinutes,
    pass_score: d.passScore,
    is_published: d.isPublished,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/tracks');
  return { ok: true };
}

export async function updateTrackAction(id: string, patch: Partial<z.input<typeof TrackInput>>): Promise<ActionResult> {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  const parsed = TrackInput.partial().safeParse(patch);
  if (!parsed.success) return { error: 'Invalid patch' };
  const d = parsed.data;
  const { error } = await supabase
    .from('certification_tracks')
    .update({
      code: d.code,
      title: d.title,
      slug: d.slug,
      description: d.description,
      exam_minutes: d.examMinutes,
      pass_score: d.passScore,
      is_published: d.isPublished,
    })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/tracks');
  revalidatePath(`/admin/tracks/${id}`);
  return { ok: true };
}

export async function togglePublishedAction(id: string, isPublished: boolean) {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  const { error } = await supabase
    .from('certification_tracks')
    .update({ is_published: isPublished })
    .eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/tracks');
}

export async function deleteTrackAction(id: string) {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  const { error } = await supabase.from('certification_tracks').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath('/admin/tracks');
}
