# 05 — AI Tutor Integration (Anthropic Claude Sonnet 4.5)

## 1. Goals

- Server-side `/api/ai/chat` streams Claude responses to the client.
- System prompt is **Meta Blueprint-tuned** (already created at `src/lib/anthropic/system-prompts.ts`).
- When the chat is invoked from a lesson page, the lesson's PDF `extracted_text` is injected as context (truncated and cached).
- Quiz generator route `/api/ai/generate-quiz` produces Meta-style questions (single, multi, scenario) from a PDF and writes them to `quizzes` + `quiz_questions` + `quiz_question_options`.
- Rate limiting: max **20 user turns / day** and **8K input tokens / turn** per learner (env-tunable via `AI_TUTOR_MAX_TOKENS_PER_DAY` etc.).
- Token usage is recorded per message for analytics + cost tracking.

## 2. Folder layout

```
src/lib/anthropic/
├── client.ts          # already exists
├── system-prompts.ts  # already exists
├── budget.ts          # rate limiter + token guards
└── quiz-schema.ts     # Zod schema for tool output

src/app/api/ai/
├── chat/route.ts          # streaming chat (SSE)
└── generate-quiz/route.ts # synchronous JSON tool-use

src/components/ai-tutor/
└── chat-panel.tsx
```

## 3. Rate limiter & token budget

`src/lib/anthropic/budget.ts`

```ts
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export const DAILY_TURN_LIMIT = parseInt(process.env.AI_TUTOR_MAX_REQUESTS_PER_HOUR ?? '30', 10);
export const MAX_INPUT_TOKENS_PER_TURN = 8_000;
export const MAX_OUTPUT_TOKENS = 1_024;

export async function checkAndReserveTurn(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('ai_usage_today')
    .select('turns_today')
    .eq('user_id', userId)
    .maybeSingle();

  const used = data?.turns_today ?? 0;
  if (used >= DAILY_TURN_LIMIT) {
    return { ok: false as const, reason: 'daily_turn_limit' };
  }
  return { ok: true as const, turnsUsed: used };
}

// Approximate token count: 1 token ≈ 4 chars (English).
export function approxTokens(s: string) {
  return Math.ceil(s.length / 4);
}
```

## 4. Lesson context helper

Append to `src/lib/anthropic/system-prompts.ts`:

```ts
export function lessonContextBlock(lessonTitle: string, pdfText: string | null) {
  if (!pdfText) return '';
  const trimmed = pdfText.slice(0, 24_000); // ~6K tokens
  return `
<lesson_context lesson="${lessonTitle.replace(/[<>"]/g, '')}">
${trimmed}
</lesson_context>

Use the <lesson_context> when answering. Quote it sparingly. If the answer is
not in the context, say so and offer general Meta Blueprint guidance.
`.trim();
}
```

## 5. Streaming chat route

`src/app/api/ai/chat/route.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/roles';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { META_TUTOR_SYSTEM_PROMPT, lessonContextBlock } from '@/lib/anthropic/system-prompts';
import { checkAndReserveTurn, approxTokens, MAX_INPUT_TOKENS_PER_TURN, MAX_OUTPUT_TOKENS } from '@/lib/anthropic/budget';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const Body = z.object({
  sessionId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  message: z.string().min(1).max(4_000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).default([]),
});

export async function POST(req: NextRequest) {
  const { user, supabase } = await requireUser();
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const { sessionId, lessonId, message, history } = parsed.data;

  // SECURITY: rate limit per user per day
  const gate = await checkAndReserveTurn(user.id);
  if (!gate.ok) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });

  // Optional lesson context — only if learner can read this lesson (RLS-checked)
  let contextBlock = '';
  let lessonTitle = '';
  if (lessonId) {
    const { data: lesson } = await supabase.from('lessons').select('id, title').eq('id', lessonId).single();
    if (lesson) {
      lessonTitle = lesson.title;
      // SECURITY: read resources via the user's RLS-authenticated client (not service role)
      const { data: pdfRes } = await supabase
        .from('resources')
        .select('extracted_text')
        .eq('lesson_id', lessonId).eq('kind', 'pdf')
        .order('order_index').limit(1).maybeSingle();
      contextBlock = lessonContextBlock(lessonTitle, pdfRes?.extracted_text ?? null);
    }
  }

  const userTurnText = `${contextBlock}\n\nLearner question:\n${message}`;
  // SECURITY: enforce per-turn input token cap
  if (approxTokens(META_TUTOR_SYSTEM_PROMPT + userTurnText + JSON.stringify(history)) > MAX_INPUT_TOKENS_PER_TURN) {
    return NextResponse.json({ error: 'input_too_large' }, { status: 413 });
  }

  let resolvedSessionId = sessionId;
  if (!resolvedSessionId) {
    const { data: s } = await supabase
      .from('ai_chat_sessions')
      .insert({ user_id: user.id, lesson_id: lessonId ?? null, title: message.slice(0, 60) })
      .select('id').single();
    resolvedSessionId = s!.id;
  }

  await supabase.from('ai_chat_messages').insert({
    session_id: resolvedSessionId, role: 'user', content: message,
  });

  const messages = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: userTurnText },
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let assistantText = '';
      let inputTokens = 0;
      let outputTokens = 0;

      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send('session', { sessionId: resolvedSessionId });

      try {
        const response = anthropic.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: META_TUTOR_SYSTEM_PROMPT,
          messages,
        });

        for await (const evt of response) {
          if (evt.type === 'content_block_delta' && evt.delta.type === 'text_delta') {
            assistantText += evt.delta.text;
            send('delta', { text: evt.delta.text });
          }
        }

        const final = await response.finalMessage();
        inputTokens = final.usage.input_tokens;
        outputTokens = final.usage.output_tokens;

        const admin = createAdminClient();
        await admin.from('ai_chat_messages').insert({
          session_id: resolvedSessionId,
          role: 'assistant',
          content: assistantText,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        });

        send('done', { inputTokens, outputTokens });
      } catch (err: any) {
        send('error', { message: err?.message ?? 'unknown' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
```

## 6. Chat panel client

`src/components/ai-tutor/chat-panel.tsx`

```tsx
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';

type Msg = { role: 'user' | 'assistant'; content: string };

export function ChatPanel({ lessonId }: { lessonId?: string }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();

  async function send() {
    if (!input.trim() || streaming) return;
    const userMsg: Msg = { role: 'user', content: input };
    setMessages((m) => [...m, userMsg, { role: 'assistant', content: '' }]);
    setInput('');
    setStreaming(true);

    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId, lessonId, message: userMsg.content,
        history: messages.slice(-10),
      }),
    });

    if (!res.ok || !res.body) {
      setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: 'Error: ' + res.status }]);
      setStreaming(false);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const block of events) {
        const [evtLine, dataLine] = block.split('\n');
        if (!evtLine || !dataLine) continue;
        const evt = evtLine.replace('event: ', '');
        const data = JSON.parse(dataLine.replace('data: ', ''));

        if (evt === 'session') setSessionId(data.sessionId);
        if (evt === 'delta') {
          setMessages((m) => {
            const copy = [...m];
            copy[copy.length - 1] = {
              role: 'assistant',
              content: copy[copy.length - 1].content + data.text,
            };
            return copy;
          });
        }
        if (evt === 'done' || evt === 'error') setStreaming(false);
      }
    }
  }

  return (
    <Card className="flex h-[600px] flex-col">
      <ScrollArea className="flex-1 p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'mb-3 text-right' : 'mb-3'}>
            <span className={`inline-block rounded-lg px-3 py-2 ${m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
              {m.content || '…'}
            </span>
          </div>
        ))}
      </ScrollArea>
      <div className="flex gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about Advantage+, CAPI, attribution windows…"
          rows={2}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
        />
        <Button onClick={send} disabled={streaming}>Send</Button>
      </div>
    </Card>
  );
}
```

## 7. Quiz generation (Anthropic tool-use)

`src/lib/anthropic/quiz-schema.ts`

```ts
import { z } from 'zod';

export const QuizQuestion = z.object({
  kind: z.enum(['single', 'multi', 'scenario']),
  prompt: z.string().min(10),
  scenario: z.string().optional(),
  options: z.array(z.object({
    label: z.string().min(1),
    is_correct: z.boolean(),
  })).min(3).max(5),
  explanation: z.string().min(10),
});

export const QuizPayload = z.object({
  title: z.string().min(3),
  questions: z.array(QuizQuestion).min(3).max(20),
});
```

`src/app/api/ai/generate-quiz/route.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/roles';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { QUIZ_GENERATOR_SYSTEM_PROMPT } from '@/lib/anthropic/system-prompts';
import { QuizPayload } from '@/lib/anthropic/quiz-schema';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const Body = z.object({
  lessonId: z.string().uuid(),
  count: z.number().int().min(3).max(20).default(10),
  examCodes: z.array(z.string()).default([]),
  kindMix: z.object({
    single: z.number().int().min(0).default(6),
    multi:  z.number().int().min(0).default(2),
    scenario: z.number().int().min(0).default(2),
  }).default({ single: 6, multi: 2, scenario: 2 }),
});

const TOOL = {
  name: 'emit_quiz',
  description: 'Emit a Meta-style practice quiz.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['single', 'multi', 'scenario'] },
            prompt: { type: 'string' },
            scenario: { type: 'string' },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  is_correct: { type: 'boolean' },
                },
                required: ['label', 'is_correct'],
              },
              minItems: 3, maxItems: 5,
            },
            explanation: { type: 'string' },
          },
          required: ['kind', 'prompt', 'options', 'explanation'],
        },
      },
    },
    required: ['title', 'questions'],
  },
} as const;

export async function POST(req: NextRequest) {
  await requireRole('admin'); // SECURITY: only admins generate quizzes
  const body = Body.parse(await req.json());
  const admin = createAdminClient();

  const { data: pdf } = await admin
    .from('resources')
    .select('extracted_text, lesson_id')
    .eq('lesson_id', body.lessonId).eq('kind', 'pdf')
    .order('order_index').limit(1).maybeSingle();

  if (!pdf?.extracted_text) {
    return NextResponse.json({ error: 'No PDF context for this lesson' }, { status: 400 });
  }

  const userMsg = `
Generate ${body.count} questions from the study material below.
Mix: ${body.kindMix.single} single, ${body.kindMix.multi} multi, ${body.kindMix.scenario} scenario.
Exam tags: ${body.examCodes.join(', ') || 'general Meta Blueprint'}

<study_material>
${pdf.extracted_text.slice(0, 40_000)}
</study_material>
`.trim();

  const result = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: 4096,
    system: QUIZ_GENERATOR_SYSTEM_PROMPT,
    tools: [TOOL],
    tool_choice: { type: 'tool', name: 'emit_quiz' },
    messages: [{ role: 'user', content: userMsg }],
  });

  const tu = result.content.find((c) => c.type === 'tool_use');
  if (!tu || tu.type !== 'tool_use') {
    return NextResponse.json({ error: 'Model did not emit quiz' }, { status: 502 });
  }

  // SECURITY: validate model output before persistence
  const payload = QuizPayload.parse(tu.input);

  const { data: quiz, error: qErr } = await admin.from('quizzes').insert({
    lesson_id: body.lessonId,
    title: payload.title,
    kind: 'practice',
    exam_codes: body.examCodes,
    pass_score: 70,
    question_count: payload.questions.length,
  }).select('id').single();
  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  for (let i = 0; i < payload.questions.length; i++) {
    const q = payload.questions[i];
    const { data: qRow } = await admin.from('quiz_questions').insert({
      quiz_id: quiz.id,
      kind: q.kind,
      prompt: q.prompt,
      scenario: q.scenario ?? null,
      explanation: q.explanation,
      order_index: i,
    }).select('id').single();

    await admin.from('quiz_question_options').insert(
      q.options.map((o, j) => ({
        question_id: qRow!.id,
        label: o.label,
        is_correct: o.is_correct,
        order_index: j,
      })),
    );
  }

  return NextResponse.json({ quizId: quiz.id, count: payload.questions.length });
}
```

## 8. Verification checklist

- [ ] Posting to `/api/ai/chat` without a session cookie → 302 to `/login`.
- [ ] Hitting the daily limit → 429 `rate_limited`.
- [ ] Input over 8K approx tokens → 413 `input_too_large`.
- [ ] Streaming chunks render incrementally in the UI.
- [ ] Generated quiz rows have `quiz_question_options.is_correct` set; learner cannot read that column.
- [ ] Quiz generation rejected for non-admin (`requireRole('admin')`).

## Claude Project Prompt

> Using `05-ai-tutor-integration.md`, generate `src/lib/anthropic/{budget,quiz-schema}.ts`, the streaming `src/app/api/ai/chat/route.ts`, the synchronous `src/app/api/ai/generate-quiz/route.ts`, and the `src/components/ai-tutor/chat-panel.tsx`. Wire Zod validation on every boundary, persist token usage on `ai_chat_messages`, and enforce the daily turn cap + per-turn input cap. Then write a unit test that mocks `anthropic.messages.stream` and asserts that delta events are forwarded as SSE.
