import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import type Anthropic from '@anthropic-ai/sdk';
import { requireUser } from '@/lib/auth/roles';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import {
  META_TUTOR_SYSTEM_PROMPT,
  lessonContextBlock,
} from '@/lib/anthropic/system-prompts';
import {
  checkAndReserveTurn,
  approxTokens,
  MAX_INPUT_TOKENS_PER_TURN,
  MAX_OUTPUT_TOKENS,
} from '@/lib/anthropic/budget';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const Body = z.object({
  sessionId: z.string().uuid().optional(),
  lessonId: z.string().uuid().optional(),
  message: z.string().min(1).max(4_000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
      })
    )
    .max(20)
    .default([]),
});

export async function POST(req: NextRequest) {
  const { user, supabase } = await requireUser();

  let parsed;
  try {
    parsed = Body.safeParse(await req.json());
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const { sessionId, lessonId, message, history } = parsed.data;

  // SECURITY: rate-limit per user per day BEFORE doing any expensive work.
  const gate = await checkAndReserveTurn(user.id);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.reason }, { status: 429 });
  }

  // Optional lesson context — only readable if the learner is enrolled,
  // since `resources` RLS gates on enrollment.
  let lessonTitle = '';
  let lessonContext: string | null = null;
  if (lessonId) {
    const { data: lesson } = await supabase
      .from('lessons')
      .select('id, title')
      .eq('id', lessonId)
      .single();
    if (lesson) {
      lessonTitle = lesson.title;
      const { data: pdfRes } = await supabase
        .from('resources')
        .select('extracted_text')
        .eq('lesson_id', lessonId)
        .eq('kind', 'pdf')
        .order('order_index')
        .limit(1)
        .maybeSingle();
      lessonContext = lessonContextBlock(lessonTitle, pdfRes?.extracted_text ?? null);
    }
  }

  // SECURITY: enforce per-turn input cap (cheap pre-flight; final billing is
  // measured by the API and recorded below).
  const totalApprox =
    approxTokens(META_TUTOR_SYSTEM_PROMPT) +
    approxTokens(lessonContext ?? '') +
    approxTokens(message) +
    approxTokens(JSON.stringify(history));
  if (totalApprox > MAX_INPUT_TOKENS_PER_TURN) {
    return NextResponse.json({ error: 'input_too_large' }, { status: 413 });
  }

  // Resolve / create the chat session.
  let resolvedSessionId = sessionId;
  if (!resolvedSessionId) {
    const { data: s, error } = await supabase
      .from('ai_chat_sessions')
      .insert({
        user_id: user.id,
        lesson_id: lessonId ?? null,
        title: message.slice(0, 60),
      })
      .select('id')
      .single();
    if (error || !s) {
      return NextResponse.json({ error: 'session_create_failed' }, { status: 500 });
    }
    resolvedSessionId = s.id;
  }

  // Persist the user turn before streaming so it's recorded even if the
  // stream is cut short.
  await supabase.from('ai_chat_messages').insert({
    session_id: resolvedSessionId,
    role: 'user',
    content: message,
  });

  // Build the system prompt. Two text blocks so the cache_control on the
  // lesson-context block caches both the static tutor prompt and the
  // lesson context together — repeat questions about the same lesson get
  // a cache hit on the long PDF context.
  const systemBlocks: Anthropic.TextBlockParam[] = [
    { type: 'text', text: META_TUTOR_SYSTEM_PROMPT },
  ];
  if (lessonContext) {
    systemBlocks.push({
      type: 'text',
      text: lessonContext,
      cache_control: { type: 'ephemeral' },
    });
  }

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  // Stream as SSE back to the client. We forward Anthropic's own `text`
  // helper events (already deltas) and capture the final usage at the end.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      send('session', { sessionId: resolvedSessionId });

      let assistantText = '';
      try {
        const stream = anthropic.messages.stream({
          model: ANTHROPIC_MODEL,
          max_tokens: MAX_OUTPUT_TOKENS,
          system: systemBlocks,
          messages,
        });

        // Use the SDK's `text` event — already filtered/joined deltas.
        stream.on('text', (delta) => {
          assistantText += delta;
          send('delta', { text: delta });
        });

        const final = await stream.finalMessage();
        const inputTokens = final.usage.input_tokens;
        const outputTokens = final.usage.output_tokens;
        const cacheReadTokens = final.usage.cache_read_input_tokens ?? 0;
        const cacheWriteTokens = final.usage.cache_creation_input_tokens ?? 0;

        // Persist the assistant turn with usage. We use the admin client
        // here because we already verified ownership of the session above,
        // and we want the write to succeed even if RLS state on the user's
        // session has shifted in the interim.
        const admin = createAdminClient();
        await admin.from('ai_chat_messages').insert({
          session_id: resolvedSessionId,
          role: 'assistant',
          content: assistantText,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        });

        send('done', {
          inputTokens,
          outputTokens,
          cacheReadTokens,
          cacheWriteTokens,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown';
        send('error', { message });
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
