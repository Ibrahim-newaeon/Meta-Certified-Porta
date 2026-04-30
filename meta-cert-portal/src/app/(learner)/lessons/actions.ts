'use server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/roles';

const ProgressInput = z.object({
  lessonId: z.string().uuid(),
  lastPosition: z.number().int().min(0).max(86_400),
  completed: z.boolean(),
});

type Result = { error?: string; ok?: boolean } | null;

export async function saveProgressAction(
  input: z.input<typeof ProgressInput>
): Promise<Result> {
  const { user, supabase } = await requireUser();
  const parsed = ProgressInput.safeParse(input);
  if (!parsed.success) return { error: 'Invalid input' };
  const data = parsed.data;

  // SECURITY: RLS "progress_self_rw" enforces user_id = auth.uid()
  const { error } = await supabase.from('progress').upsert(
    {
      user_id: user.id,
      lesson_id: data.lessonId,
      status: data.completed ? 'completed' : 'in_progress',
      last_position: data.lastPosition,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,lesson_id' }
  );

  if (error) return { error: error.message };
  return { ok: true };
}
