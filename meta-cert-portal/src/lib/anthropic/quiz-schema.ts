import { z } from 'zod';

export const QuizQuestion = z.object({
  kind: z.enum(['single', 'multi', 'scenario']),
  prompt: z.string().min(10),
  scenario: z.string().optional(),
  options: z
    .array(
      z.object({
        label: z.string().min(1),
        is_correct: z.boolean(),
      })
    )
    .min(3)
    .max(5),
  explanation: z.string().min(10),
});

export const QuizPayload = z.object({
  title: z.string().min(3),
  questions: z.array(QuizQuestion).min(3).max(20),
});

export type QuizPayloadT = z.infer<typeof QuizPayload>;

// Tool schema given to Claude. Keep in sync with the Zod schema above.
// Typed loose to satisfy the Anthropic SDK's mutable-array tool shape.
import type Anthropic from '@anthropic-ai/sdk';

export const QUIZ_TOOL: Anthropic.Tool = {
  name: 'emit_quiz',
  description: 'Emit a Meta Blueprint-style practice quiz.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string' },
      questions: {
        type: 'array',
        minItems: 3,
        maxItems: 20,
        items: {
          type: 'object',
          properties: {
            kind: { type: 'string', enum: ['single', 'multi', 'scenario'] },
            prompt: { type: 'string' },
            scenario: { type: 'string' },
            options: {
              type: 'array',
              minItems: 3,
              maxItems: 5,
              items: {
                type: 'object',
                properties: {
                  label: { type: 'string' },
                  is_correct: { type: 'boolean' },
                },
                required: ['label', 'is_correct'],
              },
            },
            explanation: { type: 'string' },
          },
          required: ['kind', 'prompt', 'options', 'explanation'],
        },
      },
    },
    required: ['title', 'questions'],
  },
};
