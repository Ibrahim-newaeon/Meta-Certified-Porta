# 03 — Admin Panel

## 1. Scope

Admin UI lives at `/admin/*`. All routes are gated by `middleware.ts` plus `requireRole('admin')` in every RSC and Server Action. Admins can:

- CRUD certification tracks, modules, lessons.
- Upload resources of three kinds: **link**, **PDF**, **video**.
- Manage users (invite, promote/demote, deactivate).
- View analytics: enrollments per track, lesson completion rate, mock-exam pass rate, AI tutor usage.

## 2. Folder layout

```
src/app/admin/
├── layout.tsx                 # AdminShell with sidebar (shadcn Sidebar)
├── page.tsx                   # Dashboard (analytics)
├── tracks/
│   ├── page.tsx               # list + create
│   ├── [trackId]/page.tsx     # edit + manage modules
│   └── actions.ts
├── modules/actions.ts
├── lessons/
│   ├── [lessonId]/page.tsx    # lesson editor + resource list
│   └── actions.ts
├── resources/
│   ├── new-link/page.tsx
│   ├── new-pdf/page.tsx
│   ├── new-video/page.tsx
│   └── actions.ts
├── quizzes/
│   ├── [quizId]/page.tsx
│   └── actions.ts
└── users/
    ├── page.tsx
    └── actions.ts

src/components/admin/
├── admin-shell.tsx
├── tracks-table.tsx
├── lesson-editor.tsx
├── resource-link-form.tsx
├── resource-pdf-form.tsx
├── resource-video-form.tsx
├── users-table.tsx
└── analytics-cards.tsx
```

## 3. Admin shell

`src/app/admin/layout.tsx`

```tsx
import { requireRole } from '@/lib/auth/roles';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireRole('admin'); // SECURITY: server-side gate
  return <AdminShell user={profile}>{children}</AdminShell>;
}
```

## 4. Resource upload — three forms

### 4.1 Link resource (with @microlink preview)

```tsx
'use client';
import { useState, useTransition } from 'react';
import { z } from 'zod';
import { createLinkResourceAction } from '@/app/admin/resources/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import Microlink from '@microlink/react';

const Schema = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(2).max(200),
  url: z.string().url(),
  examCodes: z.array(z.string()).default([]),
});

export function ResourceLinkForm({ lessonId, examCodes }: { lessonId: string; examCodes: string[] }) {
  const [url, setUrl] = useState('');
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      action={(fd) => start(async () => {
        setError(null);
        const parsed = Schema.safeParse({
          lessonId,
          title: fd.get('title'),
          url: fd.get('url'),
          examCodes,
        });
        if (!parsed.success) return setError('Invalid form');
        const res = await createLinkResourceAction(parsed.data);
        if (res?.error) setError(res.error);
      })}
      className="space-y-4"
    >
      <div><Label>Title</Label><Input name="title" required /></div>
      <div>
        <Label>URL</Label>
        <Input name="url" type="url" required value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      {url && (
        <Card className="p-2">
          <Microlink url={url} size="large" />
        </Card>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add link'}</Button>
    </form>
  );
}
```

### 4.2 PDF resource (Storage upload + server-side text extraction)

```tsx
'use client';
import { useTransition, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { finalizePdfResourceAction } from '@/app/admin/resources/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export function ResourcePdfForm({ lessonId }: { lessonId: string }) {
  const [pending, start] = useTransition();
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(fd: FormData) {
    setError(null);
    const file = fd.get('file') as File;
    const title = String(fd.get('title') ?? '');
    if (!file || file.type !== 'application/pdf') return setError('PDF only');
    if (file.size > 50 * 1024 * 1024) return setError('Max 50 MB'); // SECURITY: client-side size guard

    const supabase = createClient();
    const path = `${lessonId}/${crypto.randomUUID()}.pdf`;

    // SECURITY: storage RLS "pdfs_admin_write" checks public.is_admin() before accepting the upload
    const { error: upErr } = await supabase.storage
      .from('resource-pdfs')
      .upload(path, file, { contentType: 'application/pdf', upsert: false });

    if (upErr) return setError(upErr.message);
    setPct(60);

    const res = await finalizePdfResourceAction({
      lessonId, title, bucket: 'resource-pdfs', path,
    });
    if (res?.error) setError(res.error);
    setPct(100);
  }

  return (
    <form action={(fd) => start(() => onSubmit(fd))} className="space-y-4">
      <div><Label>Title</Label><Input name="title" required /></div>
      <div><Label>PDF file</Label><Input name="file" type="file" accept="application/pdf" required /></div>
      {pct > 0 && <Progress value={pct} />}
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={pending}>Upload PDF</Button>
    </form>
  );
}
```

`src/lib/pdf/extract.ts`

```ts
import 'server-only';
import pdfParse from 'pdf-parse';

export async function extractPdfText(buffer: Buffer) {
  const out = await pdfParse(buffer);
  return { text: out.text, pageCount: out.numpages };
}
```

`src/app/admin/resources/actions.ts`

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';
import { extractPdfText } from '@/lib/pdf/extract';

const PdfInput = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(2).max(200),
  bucket: z.literal('resource-pdfs'),
  path: z.string().min(3),
});

export async function finalizePdfResourceAction(input: z.infer<typeof PdfInput>) {
  await requireRole('admin'); // SECURITY: must precede any admin client use
  const data = PdfInput.parse(input);
  const admin = createAdminClient();

  const { data: file, error: dlErr } = await admin.storage.from(data.bucket).download(data.path);
  if (dlErr || !file) return { error: 'Download failed' };

  const buf = Buffer.from(await file.arrayBuffer());
  const { text, pageCount } = await extractPdfText(buf);

  const { error: insErr } = await admin.from('resources').insert({
    lesson_id: data.lessonId,
    kind: 'pdf',
    title: data.title,
    storage_bucket: data.bucket,
    storage_path: data.path,
    page_count: pageCount,
    extracted_text: text.slice(0, 1_000_000), // SECURITY: cap to ~1MB to bound DB row size
  });
  if (insErr) return { error: insErr.message };

  revalidatePath(`/admin/lessons/${data.lessonId}`);
}

const LinkInput = z.object({
  lessonId: z.string().uuid(),
  title: z.string().min(2).max(200),
  url: z.string().url(),
  examCodes: z.array(z.string()).default([]),
});

export async function createLinkResourceAction(input: z.infer<typeof LinkInput>) {
  const { supabase } = await requireRole('admin');
  const data = LinkInput.parse(input);
  // SECURITY: anon-keyed client; RLS "resources_admin_write" enforces is_admin()
  const { error } = await supabase.from('resources').insert({
    lesson_id: data.lessonId, kind: 'link', title: data.title,
    url: data.url, exam_codes: data.examCodes,
  });
  if (error) return { error: error.message };
  revalidatePath(`/admin/lessons/${data.lessonId}`);
}
```

### 4.3 Video resource (Mux direct upload)

```ts
// src/lib/mux/client.ts
import 'server-only';
import Mux from '@mux/mux-node';

export const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});
```

```ts
// in admin/resources/actions.ts
import { mux } from '@/lib/mux/client';

export async function createMuxUploadAction(lessonId: string, title: string) {
  const { supabase } = await requireRole('admin');

  // SECURITY: signed playback policy means viewers need a JWT (we sign per-request)
  const upload = await mux.video.uploads.create({
    cors_origin: process.env.NEXT_PUBLIC_APP_URL!,
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
    .select('id').single();
  if (error) return { error: error.message };
  return { uploadUrl: upload.url, resourceId: data.id };
}
```

`src/app/api/mux/webhook/route.ts`

```ts
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'node:crypto';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const raw = await req.text();
  const h = await headers();
  const sig = h.get('mux-signature') ?? '';

  // SECURITY: HMAC verification of webhook to prevent spoofed asset events
  const [t, v1] = sig.split(',').map((p) => p.split('=')[1]);
  const payload = `${t}.${raw}`;
  const expected = crypto.createHmac('sha256', process.env.MUX_WEBHOOK_SECRET!)
    .update(payload).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(expected))) {
    return NextResponse.json({ error: 'bad signature' }, { status: 400 });
  }

  const evt = JSON.parse(raw);
  if (evt.type === 'video.asset.ready') {
    const asset = evt.data;
    const playbackId = asset.playback_ids?.[0]?.id;
    const uploadId = asset.upload_id;

    const admin = createAdminClient();
    await admin.from('resources').update({
      video_asset_id: asset.id,
      video_playback_id: playbackId,
      video_duration_s: Math.round(asset.duration ?? 0),
    }).eq('video_playback_id', uploadId);
  }
  return NextResponse.json({ ok: true });
}
```

## 5. Tracks / Modules / Lessons CRUD

`src/app/admin/tracks/actions.ts`

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';

const TrackInput = z.object({
  code: z.string().regex(/^[A-Z]{4,8}$/),
  title: z.string().min(3).max(120),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional(),
  examMinutes: z.number().int().min(15).max(240).default(75),
  passScore: z.number().int().min(50).max(100).default(70),
  isPublished: z.boolean().default(false),
});

export async function createTrackAction(input: z.infer<typeof TrackInput>) {
  const { supabase } = await requireRole('admin');
  const data = TrackInput.parse(input);
  const { error } = await supabase.from('certification_tracks').insert({
    code: data.code, title: data.title, slug: data.slug,
    description: data.description, exam_minutes: data.examMinutes,
    pass_score: data.passScore, is_published: data.isPublished,
  });
  if (error) return { error: error.message };
  revalidatePath('/admin/tracks');
}
```

Same pattern for `updateTrackAction`, `deleteTrackAction`, modules CRUD, lessons CRUD. Each starts with `requireRole('admin')`.

## 6. User management

`src/app/admin/users/actions.ts`

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

const Invite = z.object({ email: z.string().email(), role: z.enum(['admin', 'learner']) });

export async function inviteUserAction(input: z.infer<typeof Invite>) {
  await requireRole('admin');
  const { email, role } = Invite.parse(input);
  const admin = createAdminClient();

  // SECURITY: service-role only used after admin gate
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  });
  if (error) return { error: error.message };

  if (role === 'admin' && data.user) {
    await admin.from('profiles').update({ role: 'admin' }).eq('id', data.user.id);
  }
  revalidatePath('/admin/users');
}

export async function setRoleAction(userId: string, role: 'admin' | 'learner') {
  const { user } = await requireRole('admin');
  if (userId === user.id && role !== 'admin') {
    return { error: 'Cannot demote yourself' }; // SECURITY: prevent admin lockout
  }
  const admin = createAdminClient();
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
  if (error) return { error: error.message };
  revalidatePath('/admin/users');
}
```

## 7. Analytics dashboard

`src/app/admin/page.tsx`

```tsx
import { requireRole } from '@/lib/auth/roles';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default async function AdminDashboard() {
  const { supabase } = await requireRole('admin');

  const [{ count: userCount }, { count: enrollCount }, { data: completions }, { data: aiUsage }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('enrollments').select('*', { count: 'exact', head: true }),
    supabase.from('progress').select('lesson_id, status').eq('status', 'completed'),
    supabase.from('ai_usage_today').select('user_id, turns_today, tokens_today'),
  ]);

  const totalAiTurns = (aiUsage ?? []).reduce((s, r) => s + (r.turns_today ?? 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
      <Card><CardHeader><CardTitle>Users</CardTitle></CardHeader><CardContent>{userCount ?? 0}</CardContent></Card>
      <Card><CardHeader><CardTitle>Enrollments</CardTitle></CardHeader><CardContent>{enrollCount ?? 0}</CardContent></Card>
      <Card><CardHeader><CardTitle>Lesson completions</CardTitle></CardHeader><CardContent>{completions?.length ?? 0}</CardContent></Card>
      <Card><CardHeader><CardTitle>AI tutor turns today</CardTitle></CardHeader><CardContent>{totalAiTurns}</CardContent></Card>
    </div>
  );
}
```

## 8. shadcn/ui components used in admin

`Sidebar`, `Card`, `Table`, `Dialog`, `AlertDialog`, `Form`, `Input`, `Textarea`, `Select`, `Switch`, `Tabs`, `Progress`, `Badge`, `Toast` (sonner), `Chart`.

## 9. Verification checklist

- [ ] Non-admin POST to any `/admin/.../actions` → rejected by `requireRole('admin')`.
- [ ] PDF > 50 MB → rejected client-side, and server still validates with Storage limits.
- [ ] After PDF upload, the row's `extracted_text` is populated and length matches expectation.
- [ ] Admin cannot demote themselves.
- [ ] Mux upload completes and webhook updates `video_playback_id` to a real Mux ID.

## Claude Project Prompt

> Using `03-admin-panel.md`, generate the full admin module. Start with `src/app/admin/layout.tsx`, then `tracks/`, `lessons/`, `resources/{new-link,new-pdf,new-video}`, `users/`, and the analytics `page.tsx`. Implement all server actions with `requireRole('admin')` first and Zod validation. Use shadcn/ui components: Sidebar, Card, Table, Dialog, AlertDialog, Form, Input, Textarea, Select, Switch, Tabs, Progress. Wire the Mux upload via `@mux/upchunk` and the webhook handler at `src/app/api/mux/webhook/route.ts`. After generation, output a 5-step manual QA script.
