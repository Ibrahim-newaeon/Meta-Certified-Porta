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
  // SECURITY: anon-keyed client; RLS "resources_admin_write" enforces is_admin()
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
  // SECURITY: must precede any service-role client use
  await requireRole('admin');
  const parsed = PdfFinalizeInput.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  const d = parsed.data;

  const admin = createAdminClient();

  // Download the file with service role to extract text server-side.
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
    // Don't fail the upload if extraction fails — the PDF is still viewable.
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
    // SECURITY: cap stored text to ~1MB to bound row size and Postgres TOAST cost
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

  // SECURITY: signed playback policy — viewers need a JWT signed per-request
  const upload = await getMux().video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
    new_asset_settings: { playback_policy: ['signed'] },
  });

  // Pre-create a placeholder resource row; webhook will populate playback_id.
  const { data, error } = await supabase
    .from('resources')
    .insert({
      lesson_id: lessonId,
      kind: 'video',
      title,
      video_provider: 'mux',
      video_asset_id: 'pending',
      // Temporarily store the upload id; webhook swaps it for the real playback id.
      video_playback_id: upload.id,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  return { uploadUrl: upload.url, resourceId: data.id, uploadId: upload.id };
}

// ---------- DELETE ----------
export async function deleteResourceAction(id: string, lessonId: string) {
  await requireRole('admin');
  z.string().uuid().parse(id);
  z.string().uuid().parse(lessonId);

  const admin = createAdminClient();

  // Look up the row first so we can also clean up Storage / Mux
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
      // SECURITY: never block DB delete on a Mux API failure; orphaned assets
      // can be reconciled by a separate cron job.
    }
  }

  const { error } = await admin.from('resources').delete().eq('id', id);
  if (error) return { error: error.message };
  revalidatePath(`/admin/lessons/${lessonId}`);
}
