'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractPdfText } from '@/lib/pdf/extract';
import { getMux } from '@/lib/mux/client';

type Result = { error?: string; ok?: boolean } | null;

// ---------- LINK ----------
const LinkInput = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(2).max(200),
  url: z.string().url(),
  examCodes: z.array(z.string()).default([]),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export async function createLinkResourceAction(
  _: Result,
  fd: FormData
): Promise<Result> {
  const { supabase } = await requireRole('admin');

  const examCodes = fd.getAll('examCodes').map((v) => String(v)).filter(Boolean);
  const parsed = LinkInput.safeParse({
    lessonId: fd.get('lessonId'),
    title: fd.get('title'),
    url: fd.get('url'),
    examCodes,
    orderIndex: fd.get('orderIndex') ?? 0,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };

  const d = parsed.data;
  const { error } = await supabase.from('resources').insert({
    lesson_id: d.lessonId,
    kind: 'link',
    title: d.title,
    url: d.url,
    exam_codes: d.examCodes,
    order_index: d.orderIndex,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/lessons/${d.lessonId}`);
  return { ok: true };
}

// ---------- PDF ----------
const PdfFinalizeInput = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(2).max(200),
  bucket: z.literal('resource-pdfs'),
  path: z.string().min(3),
  orderIndex: z.coerce.number().int().min(0).default(0),
});

export async function finalizePdfResourceAction(
  input: z.input<typeof PdfFinalizeInput>
): Promise<Result> {
  await requireRole('admin');
  const parsed = PdfFinalizeInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const d = parsed.data;

  const admin = createAdminClient();

  const { data: file, error: dlErr } = await admin.storage.from(d.bucket).download(d.path);
  if (dlErr || !file) return { error: 'Storage download failed' };

  const buf = Buffer.from(await file.arrayBuffer());

  let text = '';
  let pageCount = 0;
  try {
    const out = await extractPdfText(buf);
    text = out.text;
    pageCount = out.pageCount;
  } catch {
    text = '';
    pageCount = 0;
  }

  const { error: insErr } = await admin.from('resources').insert({
    lesson_id: d.lessonId,
    kind: 'pdf',
    title: d.title,
    storage_bucket: d.bucket,
    storage_path: d.path,
    page_count: pageCount,
    extracted_text: text.slice(0, 1_000_000),
    order_index: d.orderIndex,
  });
  if (insErr) return { error: insErr.message };

  revalidatePath(`/admin/lessons/${d.lessonId}`);
  return { ok: true };
}

// ---------- VIDEO via Mux direct upload ----------
export async function createMuxUploadAction(lessonId: string, title: string) {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(lessonId);
  z.string().min(2).max(200).parse(title);

  const upload = await getMux().video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    new_asset_settings: { playback_policy: ['signed'] },
  });

  const { data, error } = await supabase
    .from('resources')
    .insert({
      lesson_id: lessonId,
      kind: 'video',
      title,
      video_provider: 'mux',
      video_asset_id: 'pending',
      video_playback_id: upload.id,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  return { uploadUrl: upload.url, resourceId: data.id, uploadId: upload.id };
}

// ---------- UPDATE ----------
const ResourcePatch = z.object({
  title: z.string().min(2).max(200).optional(),
  url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  examCodes: z.array(z.string()).optional(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

export async function updateResourceAction(_: Result, fd: FormData): Promise<Result> {
  const { supabase } = await requireRole('admin');
  const id = String(fd.get('id') ?? '');
  const lessonId = String(fd.get('lessonId') ?? '');
  z.string().uuid().parse(id);
  z.string().uuid().parse(lessonId);

  const examCodesRaw = fd.getAll('examCodes').map((v) => String(v)).filter(Boolean);

  const parsed = ResourcePatch.safeParse({
    title: fd.get('title') ?? undefined,
    url: fd.get('url') ?? undefined,
    examCodes: examCodesRaw.length ? examCodesRaw : undefined,
    orderIndex: fd.get('orderIndex') ?? undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const d = parsed.data;

  const update: Record<string, unknown> = {};
  if (d.title !== undefined) update.title = d.title;
  if (d.url !== undefined) update.url = d.url;
  if (d.examCodes !== undefined) update.exam_codes = d.examCodes;
  if (d.orderIndex !== undefined) update.order_index = d.orderIndex;

  const { error } = await supabase.from('resources').update(update).eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/lessons/${lessonId}`);
  return { ok: true };
}

// ---------- REORDER ----------
export async function reorderResourceAction(
  id: string,
  lessonId: string,
  direction: 'up' | 'down'
): Promise<Result> {
  const { supabase } = await requireRole('admin');
  z.string().uuid().parse(id);
  z.string().uuid().parse(lessonId);
  z.enum(['up', 'down']).parse(direction);

  const { data: rows } = await supabase
    .from('resources')
    .select('id, order_index')
    .eq('lesson_id', lessonId)
    .order('order_index');
  if (!rows) return { error: 'Could not load resources' };

  const idx = rows.findIndex((r) => r.id === id);
  if (idx < 0) return { error: 'Resource not found' };
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= rows.length) return { ok: true };

  const a = rows[idx];
  const b = rows[swapIdx];
  await supabase.from('resources').update({ order_index: -1 }).eq('id', a.id);
  await supabase.from('resources').update({ order_index: a.order_index }).eq('id', b.id);
  const { error } = await supabase.from('resources').update({ order_index: b.order_index }).eq('id', a.id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/lessons/${lessonId}`);
  return { ok: true };
}

// ---------- DELETE ----------
export async function deleteResourceAction(id: string, lessonId: string) {
  await requireRole('admin');
  z.string().uuid().parse(id);
  z.string().uuid().parse(lessonId);

  const admin = createAdminClient();

  const { data: row } = await admin
    .from('resources')
    .select('kind, storage_bucket, storage_path, video_provider, video_asset_id')
    .eq('id', id)
    .single();

  if (row?.kind === 'pdf' && row.storage_bucket && row.storage_path) {
    await admin.storage.from(row.storage_bucket).remove([row.storage_path]);
  }
  if (row?.kind === 'video' && row.video_provider === 'mux' && row.video_asset_id && row.video_asset_id !== 'pending') {
    try {
      await getMux().video.assets.delete(row.video_asset_id);
    } catch {
      // Orphaned Mux assets reconciled by separate cron.
    }
  }

  const { error } = await admin.from('resources').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/lessons/${lessonId}`);
}
