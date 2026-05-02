'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractDocxText } from '@/lib/docx/extract';

export type ImportResult = {
  ok?: boolean;
  error?: string;
  warning?: string;
  imported?: { module: string; lessons: number };
} | null;

const Input = z.object({
  trackId: z.string().uuid(),
  // Either an existing module id, or empty/'new' to create one with moduleTitle.
  moduleId: z.string().uuid().optional().nullable(),
  moduleTitle: z.string().min(1).max(200).default('Imported lessons'),
});

const MAX_ZIP_BYTES = 25 * 1024 * 1024; // 25 MB

// Sort filenames the way humans expect: "01.docx" < "10.docx" < "Lesson 2.docx".
function naturalCompare(a: string, b: string) {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function titleFromFilename(name: string) {
  const base = name.replace(/\.docx$/i, '').replace(/^.*[\\/]/, '');
  // strip a leading "01_" / "1 - " / "1." style index
  return base.replace(/^[\s\-_.\d]+/, '').trim() || base;
}

export async function bulkImportLessonsFromZipAction(
  _prev: ImportResult,
  formData: FormData,
): Promise<ImportResult> {
  await requireRole('admin');

  const rawModuleId = String(formData.get('moduleId') ?? '').trim();
  const parsed = Input.safeParse({
    trackId: formData.get('trackId'),
    moduleId: rawModuleId === '' || rawModuleId === 'new' ? null : rawModuleId,
    moduleTitle: String(formData.get('moduleTitle') ?? '').trim() || undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  const { trackId, moduleId: targetModuleId, moduleTitle } = parsed.data;

  const file = formData.get('zip') as File | null;
  if (!file) return { error: 'Choose a .zip file' };
  if (!/\.zip$/i.test(file.name)) return { error: 'File must be a .zip' };
  if (file.size > MAX_ZIP_BYTES) {
    return { error: `Zip too large (max ${MAX_ZIP_BYTES / 1024 / 1024} MB)` };
  }

  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());

  // Collect every .docx, top-level only or nested — we ignore folders for v1.
  const docxFiles = Object.values(zip.files).filter(
    (f) => !f.dir && /\.docx$/i.test(f.name) && !f.name.startsWith('__MACOSX'),
  );

  if (docxFiles.length === 0) {
    return { error: 'Zip contained no .docx files' };
  }

  // Stable, predictable order so admins can prefix files with "01_" etc.
  docxFiles.sort((a, b) => naturalCompare(a.name, b.name));

  const admin = createAdminClient();

  // Confirm the track exists before doing anything else.
  const { data: track } = await admin
    .from('certification_tracks')
    .select('id')
    .eq('id', trackId)
    .single();
  if (!track) return { error: 'Track not found' };

  // Resolve destination module: either an existing one on this track, or create a new one.
  let mod: { id: string };
  let resolvedModuleTitle = moduleTitle;
  let lessonOrderOffset = 0;

  if (targetModuleId) {
    // Verify the module belongs to this track (don't trust client input).
    const { data: existing, error: lookupErr } = await admin
      .from('modules')
      .select('id, title, track_id')
      .eq('id', targetModuleId)
      .single();
    if (lookupErr || !existing) {
      return { error: 'Selected module not found.' };
    }
    if (existing.track_id !== trackId) {
      return { error: 'Selected module belongs to a different track.' };
    }
    mod = { id: existing.id };
    resolvedModuleTitle = existing.title;

    // Append after the module's existing lessons.
    const { data: tail } = await admin
      .from('lessons')
      .select('order_index')
      .eq('module_id', mod.id)
      .order('order_index', { ascending: false })
      .limit(1);
    lessonOrderOffset = (tail?.[0]?.order_index ?? -1) + 1;
  } else {
    // Find the next module order_index for this track.
    const { data: existingMods } = await admin
      .from('modules')
      .select('order_index')
      .eq('track_id', trackId)
      .order('order_index', { ascending: false })
      .limit(1);
    const nextModuleOrder = (existingMods?.[0]?.order_index ?? -1) + 1;

    const { data: created, error: modErr } = await admin
      .from('modules')
      .insert({
        track_id: trackId,
        title: moduleTitle,
        order_index: nextModuleOrder,
      })
      .select('id')
      .single();
    if (modErr || !created) {
      return { error: modErr?.message ?? 'Could not create module' };
    }
    mod = { id: created.id };
  }

  let importedCount = 0;
  const failed: string[] = [];

  for (let i = 0; i < docxFiles.length; i++) {
    const f = docxFiles[i];
    let title = titleFromFilename(f.name);
    let text = '';
    try {
      const buf = await f.async('nodebuffer');
      const out = await extractDocxText(buf);
      // Prefer the inferred title from the doc body if it's longer than the
      // filename-derived one (file names are often just numbers).
      if (out.title && out.title.length > title.length) title = out.title;
      text = out.text;
    } catch (e) {
      const detail = e instanceof Error ? e.message : 'unknown';
      failed.push(`${f.name}: ${detail}`);
      continue;
    }

    if (text.trim().length === 0) {
      failed.push(`${f.name}: empty document`);
      continue;
    }

    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const estMinutes = Math.max(2, Math.ceil(wordCount / 200));

    const { data: lessonRow, error: lessonErr } = await admin
      .from('lessons')
      .insert({
        module_id: mod.id,
        title: title.slice(0, 200),
        summary: text.slice(0, 500).trim(),
        order_index: lessonOrderOffset + i,
        est_minutes: estMinutes,
      })
      .select('id')
      .single();
    if (lessonErr || !lessonRow) {
      failed.push(`${f.name}: lesson insert: ${lessonErr?.message ?? 'unknown'}`);
      continue;
    }

    const { error: resErr } = await admin.from('resources').insert({
      lesson_id: lessonRow.id,
      kind: 'text',
      title: title.slice(0, 200),
      extracted_text: text.slice(0, 1_000_000),
      order_index: 0,
    });
    if (resErr) {
      failed.push(`${f.name}: resource insert: ${resErr.message}`);
      continue;
    }

    importedCount++;
  }

  revalidatePath(`/admin/tracks/${trackId}`);

  if (importedCount === 0) {
    return {
      error: `Imported 0 lessons. ${failed.slice(0, 5).join('; ')}${failed.length > 5 ? ` (+${failed.length - 5} more)` : ''}`,
    };
  }

  const warning =
    failed.length > 0
      ? `Imported ${importedCount} of ${docxFiles.length}. Skipped: ${failed.slice(0, 3).join('; ')}${failed.length > 3 ? ` (+${failed.length - 3} more)` : ''}`
      : undefined;

  return {
    ok: true,
    imported: { module: resolvedModuleTitle, lessons: importedCount },
    warning,
  };
}
