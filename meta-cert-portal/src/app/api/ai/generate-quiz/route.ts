import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/roles';
import { anthropic, ANTHROPIC_MODEL } from '@/lib/anthropic/client';
import { QUIZ_GENERATOR_SYSTEM_PROMPT } from '@/lib/anthropic/system-prompts';
import { QuizPayload, QUIZ_TOOL } from '@/lib/anthropic/quiz-schema';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const Body = z.object({
  lessonId: z.string().uuid(),
  count: z.number().int().min(3).max(20).default(10),
  examCodes: z.array(z.string()).default([]),
  kindMix: z
    .object({
      single: z.number().int().min(0).default(6),
      multi: z.number().int().min(0).default(2),
      scenario: z.number().int().min(0).default(2),
    })
    .default({ single: 6, multi: 2, scenario: 2 }),
});

export async function POST(req: NextRequest) {
  // SECURITY: only admins generate quizzes
  await requireRole('admin');

  let body;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'bad_request';
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const admin = createAdminClient();

  // Pull the lesson's PDF text. Without it we have nothing to ground on.
  const { data: pdf } = await admin
    .from('resources')
    .select('extracted_text, lesson_id')
    .eq('lesson_id', body.lessonId)
    .eq('kind', 'pdf')
    .order('order_index')
    .limit(1)
    .maybeSingle();

  if (!pdf?.extracted_text) {
    return NextResponse.json(
      { error: 'no_pdf_context_for_lesson' },
      { status: 400 }
    );
  }

  const userMsg = [
    `Generate ${body.count} questions from the study material below.`,
    `Mix: ${body.kindMix.single} single, ${body.kindMix.multi} multi, ${body.kindMix.scenario} scenario.`,
    `Exam tags: ${body.examCodes.join(', ') || 'general Meta Blueprint'}`,
    ``,
    `<study_material>`,
    pdf.extracted_text.slice(0, 40_000),
    `</study_material>`,
  ].join('\n');

  let result;
  try {
    result = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4096,
      system: QUIZ_GENERATOR_SYSTEM_PROMPT,
      tools: [QUIZ_TOOL],
      tool_choice: { type: 'tool', name: 'emit_quiz' },
      messages: [{ role: 'user', content: userMsg }],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'anthropic_error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const tu = result.content.find((c) => c.type === 'tool_use');
  if (!tu || tu.type !== 'tool_use') {
    return NextResponse.json(
      { error: 'model_did_not_emit_quiz' },
      { status: 502 }
    );
  }

  // SECURITY: validate model output before persistence — the schema enforces
  // option counts, kind enum, etc. Anything malformed fails fast here rather
  // than landing in the database.
  let payload;
  try {
    payload = QuizPayload.parse(tu.input);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'schema_validation_failed';
    return NextResponse.json({ error: 'invalid_quiz_shape', detail: msg }, { status: 502 });
  }

  // Persist quiz + questions + options. Use service role since we're writing
  // is_correct (REVOKE'd from anon/authenticated).
  const { data: quiz, error: qErr } = await admin
    .from('quizzes')
    .insert({
      lesson_id: body.lessonId,
      title: payload.title,
      kind: 'practice',
      exam_codes: body.examCodes,
      pass_score: 70,
      question_count: payload.questions.length,
    })
    .select('id')
    .single();
  if (qErr || !quiz) {
    return NextResponse.json({ error: qErr?.message ?? 'quiz_insert_failed' }, { status: 500 });
  }

  for (let i = 0; i < payload.questions.length; i++) {
    const q = payload.questions[i];
    const { data: qRow, error: qrErr } = await admin
      .from('quiz_questions')
      .insert({
        quiz_id: quiz.id,
        kind: q.kind,
        prompt: q.prompt,
        scenario: q.scenario ?? null,
        explanation: q.explanation,
        order_index: i,
      })
      .select('id')
      .single();
    if (qrErr || !qRow) {
      return NextResponse.json(
        { error: qrErr?.message ?? 'question_insert_failed', partial_quiz_id: quiz.id },
        { status: 500 }
      );
    }

    const { error: optErr } = await admin.from('quiz_question_options').insert(
      q.options.map((o, j) => ({
        question_id: qRow.id,
        label: o.label,
        is_correct: o.is_correct,
        order_index: j,
      }))
    );
    if (optErr) {
      return NextResponse.json(
        { error: optErr.message, partial_quiz_id: quiz.id },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({
    quizId: quiz.id,
    count: payload.questions.length,
    title: payload.title,
  });
}
