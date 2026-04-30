# 04 — Learner Content Delivery

## 1. Goals

- Browse certification tracks → enroll → consume lessons.
- **Adaptive renderer** picks the correct viewer per `resource.kind`:
    - `link` → `<LinkCard />` (microlink rich preview)
    - `pdf` → `<PdfViewer />` (react-pdf, signed Storage URL)
    - `video` → `<VideoPlayer />` (Mux Player + signed JWT)
- Progress is tracked per lesson; resume picks up the last PDF page or video timestamp.
- Mock-exam mode (timed, locked, single attempt window).

## 2. Folder layout

```
src/app/(learner)/
├── layout.tsx                  # learner shell (TopNav, sidebar)
├── dashboard/page.tsx          # enrolled tracks + continue learning
├── tracks/
│   ├── page.tsx
│   └── [trackId]/page.tsx
├── lessons/[lessonId]/page.tsx
└── exam/[quizId]/page.tsx

src/components/learner/
├── track-card.tsx
├── enroll-button.tsx
├── lesson-list.tsx
├── lesson-viewer.tsx
├── link-card.tsx
├── pdf-viewer.tsx
├── video-player.tsx
├── progress-bar.tsx
├── exam-runner.tsx
└── exam-timer.tsx
```

## 3. Dashboard

```tsx
// src/app/(learner)/dashboard/page.tsx
import Link from 'next/link';
import { requireUser } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

export default async function Dashboard() {
  const { user, supabase } = await requireUser();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(`
      track_id, enrolled_at, completed_at,
      certification_tracks!inner ( id, code, title, slug, description, cover_url )
    `)
    .eq('user_id', user.id);

  const { data: lastProgress } = await supabase
    .from('progress')
    .select('lesson_id, last_position, updated_at, lessons!inner(title, module_id, modules!inner(track_id))')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <div className="space-y-8 p-6">
      {lastProgress && (
        <Card>
          <CardHeader><CardTitle>Continue where you left off</CardTitle></CardHeader>
          <CardContent>{lastProgress.lessons.title}</CardContent>
          <CardFooter>
            <Button asChild><Link href={`/lessons/${lastProgress.lesson_id}`}>Resume</Link></Button>
          </CardFooter>
        </Card>
      )}

      <h2 className="text-xl font-semibold">Your certifications</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {(enrollments ?? []).map((e) => (
          <Card key={e.track_id}>
            <CardHeader>
              <CardTitle>{e.certification_tracks.title}</CardTitle>
              <CardDescription>{e.certification_tracks.code}</CardDescription>
            </CardHeader>
            <CardContent><Progress value={e.completed_at ? 100 : 25} /></CardContent>
            <CardFooter>
              <Button asChild>
                <Link href={`/tracks/${e.certification_tracks.slug}`}>Open</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
```

## 4. Enrollment

`src/app/(learner)/tracks/actions.ts`

```ts
'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth/roles';

export async function enrollAction(trackId: string) {
  const { user, supabase } = await requireUser();
  z.string().uuid().parse(trackId);
  // SECURITY: RLS "enrollments_self_insert" enforces user_id = auth.uid()
  const { error } = await supabase.from('enrollments').insert({ user_id: user.id, track_id: trackId });
  if (error && !error.message.includes('duplicate')) return { error: error.message };
  revalidatePath('/dashboard');
}
```

## 5. Lesson viewer (adaptive)

```tsx
// src/app/(learner)/lessons/[lessonId]/page.tsx
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/roles';
import { LessonViewer } from '@/components/learner/lesson-viewer';
import { signPdfUrl, signMuxPlayback } from '@/lib/signing';

export default async function LessonPage({ params }: { params: Promise<{ lessonId: string }> }) {
  const { user, supabase } = await requireUser();
  const { lessonId } = await params;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('id, title, summary, module_id, modules!inner(track_id)')
    .eq('id', lessonId).single();
  if (!lesson) notFound();

  // RLS will already block this query if the user is not enrolled
  const { data: resources } = await supabase
    .from('resources')
    .select('id, kind, title, order_index, url, storage_bucket, storage_path, page_count, video_provider, video_playback_id, video_duration_s, video_url')
    .eq('lesson_id', lessonId)
    .order('order_index');

  const { data: progress } = await supabase
    .from('progress').select('last_position, status')
    .eq('lesson_id', lessonId).eq('user_id', user.id).maybeSingle();

  // SECURITY: signed URLs are produced server-side; never expose storage_path or playback_id directly
  const prepared = await Promise.all((resources ?? []).map(async (r) => {
    if (r.kind === 'pdf' && r.storage_bucket && r.storage_path) {
      return { ...r, signedUrl: await signPdfUrl(r.storage_bucket, r.storage_path) };
    }
    if (r.kind === 'video' && r.video_provider === 'mux' && r.video_playback_id) {
      return { ...r, signedToken: await signMuxPlayback(r.video_playback_id) };
    }
    return r;
  }));

  return <LessonViewer lesson={lesson} resources={prepared} initialProgress={progress} />;
}
```

`src/lib/signing.ts`

```ts
import 'server-only';
import jwt from 'jsonwebtoken';
import { createAdminClient } from '@/lib/supabase/admin';

export async function signPdfUrl(bucket: string, path: string) {
  // SECURITY: short-lived signed URL (10 min) — must use service role since bucket is private
  const admin = createAdminClient();
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}

export function signMuxPlayback(playbackId: string) {
  // SECURITY: signed Mux JWT, audience 'v', expires in 30 minutes
  return jwt.sign(
    { sub: playbackId, aud: 'v', exp: Math.floor(Date.now() / 1000) + 1800 },
    Buffer.from(process.env.MUX_SIGNING_KEY_PRIVATE!, 'base64'),
    { algorithm: 'RS256', keyid: process.env.MUX_SIGNING_KEY_ID! },
  );
}
```

`src/components/learner/lesson-viewer.tsx`

```tsx
'use client';
import { useEffect, useState } from 'react';
import { LinkCard } from './link-card';
import { PdfViewer } from './pdf-viewer';
import { VideoPlayer } from './video-player';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { saveProgressAction } from '@/app/(learner)/lessons/actions';

export function LessonViewer({
  lesson, resources, initialProgress,
}: { lesson: any; resources: any[]; initialProgress: { last_position: number; status: string } | null }) {
  const [activeId, setActiveId] = useState<string>(resources[0]?.id);
  const active = resources.find((r) => r.id === activeId)!;

  useEffect(() => {
    saveProgressAction({ lessonId: lesson.id, lastPosition: 0, completed: false });
  }, [lesson.id]);

  return (
    <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-[260px_1fr]">
      <aside>
        <h2 className="mb-4 font-semibold">{lesson.title}</h2>
        <Tabs value={activeId} onValueChange={setActiveId} orientation="vertical">
          <TabsList className="flex flex-col">
            {resources.map((r) => (
              <TabsTrigger key={r.id} value={r.id} className="justify-start">
                <span className="mr-2 text-xs uppercase">{r.kind}</span>{r.title}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </aside>

      <main>
        {active?.kind === 'link'  && <LinkCard url={active.url} title={active.title} />}
        {active?.kind === 'pdf'   && (
          <PdfViewer
            url={active.signedUrl}
            startPage={initialProgress?.last_position ?? 1}
            onPageChange={(p) => saveProgressAction({ lessonId: lesson.id, lastPosition: p, completed: false })}
            onFinish={() => saveProgressAction({ lessonId: lesson.id, lastPosition: 0, completed: true })}
          />
        )}
        {active?.kind === 'video' && (
          <VideoPlayer
            playbackId={active.video_playback_id}
            token={active.signedToken}
            startSeconds={initialProgress?.last_position ?? 0}
            onTime={(t) => saveProgressAction({ lessonId: lesson.id, lastPosition: Math.floor(t), completed: false })}
            onEnd={() => saveProgressAction({ lessonId: lesson.id, lastPosition: 0, completed: true })}
          />
        )}
      </main>
    </div>
  );
}
```

## 6. Progress action (debounce video saves to ~10s)

```ts
// src/app/(learner)/lessons/actions.ts
'use server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/roles';

const Input = z.object({
  lessonId: z.string().uuid(),
  lastPosition: z.number().int().min(0),
  completed: z.boolean(),
});

export async function saveProgressAction(input: z.infer<typeof Input>) {
  const { user, supabase } = await requireUser();
  const data = Input.parse(input);
  // SECURITY: RLS "progress_self_rw" enforces user_id = auth.uid()
  const { error } = await supabase.from('progress').upsert({
    user_id: user.id,
    lesson_id: data.lessonId,
    status: data.completed ? 'completed' : 'in_progress',
    last_position: data.lastPosition,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: error.message };
}
```

## 7. Mock exam mode

`src/app/(learner)/exam/[quizId]/actions.ts`

```ts
'use server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/roles';
import { createAdminClient } from '@/lib/supabase/admin';

export async function startAttemptAction(quizId: string) {
  const { user, supabase } = await requireUser();
  z.string().uuid().parse(quizId);

  const { data: existing } = await supabase
    .from('quiz_attempts').select('*')
    .eq('quiz_id', quizId).eq('user_id', user.id).eq('status', 'in_progress')
    .maybeSingle();
  if (existing) return { data: existing };

  const { data: quiz } = await supabase.from('quizzes').select('time_limit_s').eq('id', quizId).single();
  const expires = quiz?.time_limit_s
    ? new Date(Date.now() + quiz.time_limit_s * 1000).toISOString()
    : null;

  const { data, error } = await supabase
    .from('quiz_attempts')
    .insert({ quiz_id: quizId, user_id: user.id, expires_at: expires })
    .select('*').single();
  if (error) return { error: error.message };
  return { data };
}

const Submit = z.object({
  attemptId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    selected: z.array(z.string().uuid()),
  })),
});

export async function submitAttemptAction(input: z.infer<typeof Submit>) {
  const { user } = await requireUser();
  const data = Submit.parse(input);
  const admin = createAdminClient();

  const { data: attempt } = await admin.from('quiz_attempts').select('*').eq('id', data.attemptId).single();
  if (!attempt || attempt.user_id !== user.id) throw new Error('Forbidden');
  if (attempt.status !== 'in_progress') throw new Error('Already submitted');

  const expired = attempt.expires_at && new Date(attempt.expires_at) < new Date();

  // SECURITY: grade with service role since is_correct is hidden from anon
  const { data: questions } = await admin
    .from('quiz_questions')
    .select('id, kind, quiz_question_options(id, is_correct)')
    .eq('quiz_id', attempt.quiz_id);

  let correctCount = 0;
  const rows = data.answers.map((a) => {
    const q = questions!.find((x) => x.id === a.questionId);
    if (!q) return null;
    const correctIds = new Set(q.quiz_question_options.filter((o) => o.is_correct).map((o) => o.id));
    const selectedIds = new Set(a.selected);
    const isCorrect =
      correctIds.size === selectedIds.size &&
      [...correctIds].every((id) => selectedIds.has(id));
    if (isCorrect) correctCount++;
    return {
      attempt_id: data.attemptId, question_id: a.questionId,
      selected_option_ids: a.selected, is_correct: isCorrect,
    };
  }).filter(Boolean);

  await admin.from('quiz_answers').upsert(rows as any);

  const score = (correctCount / (questions!.length || 1)) * 100;
  const { data: quiz } = await admin.from('quizzes').select('pass_score').eq('id', attempt.quiz_id).single();

  await admin.from('quiz_attempts').update({
    status: expired ? 'expired' : 'submitted',
    submitted_at: new Date().toISOString(),
    score,
    passed: score >= (quiz?.pass_score ?? 70),
  }).eq('id', data.attemptId);

  return { score, passed: score >= (quiz?.pass_score ?? 70), expired };
}
```

`src/components/learner/exam-runner.tsx` renders one question at a time, supports `single`, `multi`, `scenario`, and shows a countdown timer. On `remaining === 0` it auto-submits.

## 8. shadcn/ui components used in learner

`Card`, `Tabs`, `Button`, `Progress`, `RadioGroup`, `Checkbox`, `Label`, `Sheet`, `Skeleton`, `Toast`.

## 9. Verification checklist

- [ ] Non-enrolled user opening `/lessons/...` gets a 404 (RLS hides the row).
- [ ] PDF signed URL expires after 10 min and refresh issues a new one.
- [ ] Mux signed token rejects requests after 30 min.
- [ ] Refreshing a lesson resumes within 5 s of last position.
- [ ] Mock exam auto-submits at timer = 0 and locks further answer edits.

## Claude Project Prompt

> Using `04-content-delivery.md`, scaffold the learner UI under `src/app/(learner)/` and the components in `src/components/learner/`. Implement: dashboard, track browser, track detail, lesson viewer with adaptive renderer (LinkCard/PdfViewer/VideoPlayer), progress saving (debounced 10 s for video), and mock-exam runner with timer + auto-submit. Use shadcn/ui Card, Tabs, Button, Progress, RadioGroup, Checkbox, Label. Add `src/lib/signing.ts` for short-lived Storage signed URLs and Mux JWT signing. Then write a Playwright test that enrolls a learner and walks through a 2-lesson track end-to-end.
